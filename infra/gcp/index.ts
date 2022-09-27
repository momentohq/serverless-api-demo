import * as docker from "@pulumi/docker";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const location = gcp.config.region || "us-east1 ";
const project = gcp.config.project || "default";

// Used to enable cloudrun.... just do manually for now so doesn't get deleted every time.
// const enableCloudRun = new gcp.projects.Service("EnableCloudRun", {
//    service: "run.googleapis.com",
// });

const imageName = "ts-api-demo";
const myImage = new docker.Image(imageName, {
    imageName: pulumi.interpolate`gcr.io/${gcp.config.project}/${imageName}:v1.0.0`,
    build: {
        context: "../../src",
        dockerfile: '../../src/service/Dockerfile',
    },
});

// Deploy to Cloud Run. Some extra parameters like concurrency and memory are set for illustration purpose.
const service = new gcp.cloudrun.Service("ts-api-svc", {
    location,
    template: {
        spec: {
            timeoutSeconds: 15, // Default is 5 minutes :head-explode:
            containerConcurrency: 1, // Limit to 1 try to get clean a run as possible from perf perspective
            containers: [{
                envs: [
                    {
                        name: "RUNTIME",
                        value: "GCP"
                    },
                    {
                        name: "PROJECT_ID",
                        value: project
                    }
                ],
                image: myImage.imageName,
                resources: {
                    limits: {
                        cpu: "2000m",
                        memory: "2Gi",
                    },
                },
            }],
        },
    },
});

// Open the service to public unrestricted access
const serviceIam = new gcp.cloudrun.IamMember("svc-public-access", {
    service: service.name,
    location,
    role: "roles/run.invoker",
    member: "allUsers",
});

// Export the URL
export const url = service.statuses[0].url;
