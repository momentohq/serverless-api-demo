# Serverless Typescript API With Momento

This tutorial shows a basic serverless typescript REST api using DynamoDB(AWS) or Firestore(GCP) supercharged with [Momento](https://www.gomomento.com/). It contains a Serverless Application that can be built and deployed with [CDK](https://aws.amazon.com/cdk/) in AWS or [Pulumi](https://www.pulumi.com/) in GCP. The API is supposed to represent a basic `users` api. It contains the following endpoints:

```text
# Generate base users in DynamoDB to use for test 
POST /bootstrap-users

# Get single user
GET /users/1
GET /cached-users/1

# Get passed users followers names
GET /followers/1
GET /cached-followers/1
```

#### POST /bootstrap-users
Bootstraps all the test user data needed. For this demo it generates
100 test users each following 5 random other test users.

#### GET /users & /cached-users
Makes 1 call to DB (`/users`) or Momento (`/cached-users`)
```text
$ curl $API_URL/cached-users\?id\=1 -s | jq .
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
Will make 1 call to either DB (`/followers`) or Momento (`/cached-followers`) for the passed
user id and then N additional calls to either DB or Momento to look up each follower name.
```text
$ curl https://x949ucadkh.execute-api.us-east-1.amazonaws.com/Prod/cached-followers/1 -s
["Dumb Rabbit","Excited Wombat","Lazy Squirrel","Lazy Sloth","Strange Rabbit","Lazy Squirrel","Mystical Dog","Strange Cat","Dumb Dog","Excited Dog","Clingy Lion","Strange Frog","Strange Rabbit","Lazy Frog","Happy Sloth","Happy Sloth","Sad Cat","Clingy Cat","Happy Sloth","Obnoxious Fish","Excited Lion","Spacey Frog","Goofy Dog","Goofy Dog","Happy Hamster","Obnoxious Dog","Sad Cat","Obnoxious Lion","Happy Sloth","Obnoxious Otter","Angry Dog","Sad Rabbit","Excited Fish","Dumb Hamster","Clingy Otter","Angry Dog","Happy Hamster","Happy Hamster","Clingy Hamster","Happy Sloth","Happy Dog","Spacey Wombat","Clingy Lion","Clingy Sloth","Clingy Hamster","Rare Lion","Spacey Wombat","Angry Rabbit","Mystical Zebra","Excited Frog","Happy Dog","Angry Dog","Spacey Wombat"]%
```

To deploy and benchmark this demo in AWS please continue [here](./aws-demo.md)!
To deploy and benchmark this demo in GCP please continue [here](./gcp-demo.md)!