# Serverless Typescript API With Momento

This tutorial shows a basic serverless typescript REST api using DynamoDB supercharged with [Momento](https://www.gomomento.com/). It contains a 
Serverless Application that can be built and deployed with [CDK](https://aws.amazon.com/cdk/). The API is supposed to represent a basic `users` 
api. It contains the following endpoints:

```text
# Generate base users in DynamoDB to use for test 
POST /bootstrap-users

# Get single user
GET /users?id=1
GET /cached-users?id=1

# Get passed users followers names
GET /followers?id=1
GET /cached-followers?id=1
```

#### POST /bootstrap-users
Bootstraps all the test user data needed. For this demo it generates
100 test users each following 5 random other test users.

#### GET /users & /cached-users
Makes 1 call to DynamoDB (`/users`) or Momento (`/cached-users`)
```text
$ curl https://x949ucadkh.execute-api.us-east-1.amazonaws.com/Prod/cached-users\?id\=1 -s | jq .
{
  "id": "1",
  "followers": [
    "63",
    "60",
    "81",
    "18",
    "60"
  ],
  "name": "Happy Sloth"
}
```
In case you don't have it already, [jq](https://stedolan.github.io/jq/) is a great tool for working with JSON.

#### GET /followers & /cached-followers
Will make 1 call to either DynamoDB (`/followers`) or Momento (`/cached-followers`) for the passed
user id and then N additional calls to either DynamoDB or Momento to look up each follower name.
```text
$ curl https://x949ucadkh.execute-api.us-east-1.amazonaws.com/Prod/cached-followers\?id\=1 -s
["Dumb Rabbit","Excited Wombat","Lazy Squirrel","Lazy Sloth","Strange Rabbit","Lazy Squirrel","Mystical Dog","Strange Cat","Dumb Dog","Excited Dog","Clingy Lion","Strange Frog","Strange Rabbit","Lazy Frog","Happy Sloth","Happy Sloth","Sad Cat","Clingy Cat","Happy Sloth","Obnoxious Fish","Excited Lion","Spacey Frog","Goofy Dog","Goofy Dog","Happy Hamster","Obnoxious Dog","Sad Cat","Obnoxious Lion","Happy Sloth","Obnoxious Otter","Angry Dog","Sad Rabbit","Excited Fish","Dumb Hamster","Clingy Otter","Angry Dog","Happy Hamster","Happy Hamster","Clingy Hamster","Happy Sloth","Happy Dog","Spacey Wombat","Clingy Lion","Clingy Sloth","Clingy Hamster","Rare Lion","Spacey Wombat","Angry Rabbit","Mystical Zebra","Excited Frog","Happy Dog","Angry Dog","Spacey Wombat"]%
```
When deployed you will have an application that looks like this in your account:
![Arch](./pics/arch.jpeg)

The lambda application will produce these CloudWatch metrics for you to explore and contrast:
|Momento|DynamoDB|
|------|-----|
|momento-get|ddb-get|
|momento-getfollowers|ddb-getfollowers|

## Pre-reqs
* [NodeJs](https://nodejs.org/)
* [Local AWS Credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

## Tutorial
1. Please clone this repo.
    1. `git clone git@github.com:momentohq/serverless-api-demo.git`
2. Change working directory to the repo you just cloned and install dependencies
    1. `cd serverless-api-demo`
    2. `npm install`
3. Make sure you have your local AWS credentials configured. Please see [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for more info on getting started.
4. If you have not done previously bootstrap your aws account for CDK in `us-east-1`
    1. `AWS_REGION=us-east-1 npm run cdk bootstrap`
5. Install Momento CLI
   1. `brew tap momentohq/tap` 
   2. `brew install momento-cli`
6. Obtain a momento auth token in `us-east-1`
   1. `momento account signup aws --region us-east-1 --email my-email@demo.com`
7. Update your Momento Auth token for `us-east-1` in [service.ts](https://github.com/momentohq/serverless-api-demo/blob/main/lambdas/service.ts#L10) update `REPLACE_ME`.
8. Create a cache for demo with momento cli
   1. `momento configure --quick`
   2. `momento cache create --name momento-demo-users`
9. Build the project
    1. `npm run build`
10. Deploy the project into your AWS account
    1. `AWS_REGION=us-east-1 npm run cdk deploy`
11. Get the URL of your new API from cfn output shown after `npm run cdk deploy` and set in env variable.
    1. ex: `export API_URL=https://x949ucadkh.execute-api.us-east-1.amazonaws.com/Prod`
       1. _Make sure to replace with your demo stack value `x949ucadkh` is just an example._
12. Bootstrap test users
    1. `curl -X POST "$API_URL/bootstrap-users"`
13. Start benchmark script
     1. `cd bench && ./start.sh`
14. Navigate to locust dashboard at http://0.0.0.0:8089/
    1. Start synthetic test with `20` users and spawn rate of `5`
    2. Make sure to enter host you got from output of `npm run cdk deploy`
15. Open AWS Cloudwatch Metrics service in your aws account and Look for [aws-embedded-metrics](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~();namespace=~'aws-embedded-metrics) under the 'custom' metric namespace
    1. _Be patient if metrics don't show up right away. It can take a few minutes at first._
16. Chart custom metrics to compare response times. 
    ![Image](./pics/metrics.png)
16. Try adjusting graph to see metrics better
    1. Change the timespan from 3h to the last 10 minutes 
    2. Set the period of metrics to 1-minute
17. Stop load driver by stopping shell you ran `start.sh` in or from browser UI
18. You can tear down infrastructure used for testing when you are done with following command
    1. `npm run cdk destroy`

