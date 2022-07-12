# Serverless Typescript API With Momento

## Pre-reqs
* [Docker](https://docs.docker.com/engine/install/)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
* [Local AWS Credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
* [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* [Momento CLI and AuthToken](https://github.com/momentohq/momento-cli#quick-start)

## Tutorial
1. Please clone this repo.
    1. `git clone git@github.com:momentohq/serverless-api-demo.git`
2. Change working directory to the repo you just cloned
    1. `cd serverless-api-demo`
3. Make sure you have your local AWS credentials configured. Please see [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more info on getting started.
4. Add your Momento Auth token you received previously in [app.ts](https://github.com/momentohq/serverless-api-demo/blob/main/src/app.ts#L11) 
5. Build the project
    1. `sam build --beta-features`
6. Deploy the project into your AWS account
    1. `sam deploy --resolve-s3`
7. Get the URL of your new API from cfn output shown after `sam deploy`
8. Bootstrap test users
   1. `curl -X POST https://x949ucadkh.execute-api.us-east-1.amazonaws.com/Prod/bootstrap-users`
9. Start benchmark script
    1. `cd bench && ./start.sh`
10. Open AWS Cloudwatch Metrics service in your aws account and Look for [aws-embeded-metrics](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~();namespace=~'aws-embedded-metrics) under the 'custom' metric namespace
11. Chart custom metrics to compare response times.

