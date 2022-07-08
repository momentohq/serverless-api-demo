# Serverless Typescript API With Momento

## Pre-reqs
* [Docker](https://docs.docker.com/engine/install/)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
* [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)

## Build and Test Locally
```
sam build --beta-features
sam local invoke -e events/event.json
```

## Deploy
```
sam deploy --resolve-s3
```



