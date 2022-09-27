import {
    AuthorizationType,
    IdentitySource,
    LambdaIntegration,
    RequestAuthorizer,
    RestApi
} from 'aws-cdk-lib/aws-apigateway';
import {AttributeType, BillingMode, Table} from 'aws-cdk-lib/aws-dynamodb';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {App, Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {NodejsFunction, NodejsFunctionProps} from 'aws-cdk-lib/aws-lambda-nodejs';
import {join} from 'path'

export class DemoServerlessApiStack extends Stack {
    constructor(app: App, id: string) {
        super(app, id);

        const dynamoTable = new Table(this, 'momento-demo-users', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: 'momento-demo-users',
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });


        const nodeJsFunctionProps: NodejsFunctionProps = {
            environment: {
                "RUNTIME": "AWS",
            },
            bundling: {
                externalModules: [
                    'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                ],
            },
            depsLockFilePath: join(__dirname, 'src', 'package-lock.json'),
            runtime: Runtime.NODEJS_16_X,
            memorySize: 2048, // Increase memory to help with response times
            timeout: Duration.seconds(10) // Make timeout longer for bootstrap api
        }

        // Create a Lambda function for handling service requests
        const serviceLambda = new NodejsFunction(this, 'ServiceLambda', {
            entry: join(__dirname, '../../src/handlers', 'service.ts'),
            ...nodeJsFunctionProps,
        });

        // Lambda for custom authorizer
        const customAuthzLambda = new NodejsFunction(this, 'CustomAuthzFunction', {
            entry: join(__dirname, '../../src/handlers', 'isFollowerAuthorizer.ts'),
            ...nodeJsFunctionProps,
        });


        // Grant the Lambda function access to the DynamoDB table
        dynamoTable.grantReadWriteData(serviceLambda);

        // Integrate the Lambda functions with the API Gateway resource
        const svcLambdaIntegration = new LambdaIntegration(serviceLambda);
        const api = new RestApi(this, 'demo-service-api', {
            restApiName: 'demo-service',
        });

        // Set up default root proxy integration
        api.root.addProxy({
            defaultIntegration: svcLambdaIntegration,
        })

        // Add profile-img api with custom followers only authorizer
        api.root.addResource('profile-pic').addResource('{id}',
            {
                defaultMethodOptions: {
                    authorizationType: AuthorizationType.CUSTOM,
                    authorizer: new RequestAuthorizer(this, 'IsFollowerAuthorizer', {
                        authorizerName: 'authenticated-and-friends',
                        handler: customAuthzLambda,
                        // Don't cache at GW level we want follower updates enforced as quickly as possible
                        resultsCacheTtl: Duration.seconds(0),
                        identitySources: [
                            IdentitySource.header("Authorization"),
                        ]
                    })
                },
            }
        ).addMethod("GET", svcLambdaIntegration)

    }
}

const app = new App();
new DemoServerlessApiStack(app, 'demo-serverless-api');
app.synth();
