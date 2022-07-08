import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {randomUUID} from "crypto";
import {LogFormat, LogLevel, SimpleCacheClient} from '@gomomento/sdk';
import {captureAWSv3Client, getSegment, Subsegment} from "aws-xray-sdk-core";
import {metricScope, MetricsLogger, Unit} from "aws-embedded-metrics";

export const ddbClient = captureAWSv3Client(DynamoDBDocumentClient.from(new DynamoDBClient({})));
const defaultTtl = 60;
const authToken = 'REPLACE_ME';
const momento = new SimpleCacheClient(authToken, defaultTtl, {
    loggerOptions: {
        level: LogLevel.DEBUG,
        format: LogFormat.JSON
    }
});

interface User {
    id: String,
    name: String,
}


export const handler = metricScope(metrics => async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log(`processing request path: ${event.path} method: ${event.httpMethod}`)

    const traceSeg = getSegment()?.addNewSubsegment("handler")
    try {
        switch (event.path) {
            case "/create-user":
                switch (event.httpMethod) {
                    case "POST":
                        return handleNewUser(event)
                    default:
                        return gen404(event)
                }

            case "/users":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetUser(event, metrics)
                    default:
                        return gen404(event)
                }
            case "/cached-users":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetCachedUser(event, traceSeg, metrics)
                    default:
                        return gen404(event)
                }
            default:
                return gen404(event)
        }
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }
    } finally {
        if (!traceSeg?.isClosed()) {
            traceSeg?.close()
        }
    }
});

const handleNewUser = async (event: APIGatewayProxyEvent) => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: "must pass user payload to /create-user"
        }
    }
    const requestBody: { name: String } = JSON.parse(event.body)
    const user = {
        id: randomUUID(),
        name: requestBody.name
    }
    await createUser(user)
    return {
        statusCode: 200,
        body: JSON.stringify(user)
    }
}

const handleGetUser = async (event: APIGatewayProxyEvent, mLogger: MetricsLogger): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /users"
        }
    }
    const startTime = Date.now()
    const user = await getUserDDB(userId)
    mLogger.putMetric("ddb-get", Date.now() - startTime, Unit.Milliseconds)
    if (!user) {
        return {
            body: "",
            statusCode: 404
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify(user)
    }
}

const handleGetCachedUser = async (event: APIGatewayProxyEvent, trace: Subsegment | undefined, mLogger: MetricsLogger): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /cached-users"
        }
    }
    const traceSeg = getSegment()?.addNewSubsegment('momento-get');
    const startTime = Date.now();
    let user = await getUserMomento(userId)
    mLogger.putMetric("momento-get", Date.now() - startTime, Unit.Milliseconds)
    traceSeg?.close()
    if (!user) {
        console.log("no user found in momento fetching from DDB")
        user = await getUserDDB(userId)
        // Set item in cache so next time can get faster
        await momento.set("momento-demo-users", userId, JSON.stringify(user))
    }
    if (!user) {
        return {
            body: "",
            statusCode: 404
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify(user)
    }
}

export const createUser = async (user: User) => {
    await ddbClient.send(new PutCommand({
        TableName: "momento-demo-users",
        Item: user,
    }));
};

export const getUserDDB = async (id: string) => {
    const dbRsp = await ddbClient.send(new GetCommand({Key: {id}, TableName: "momento-demo-users"}));
    return dbRsp.Item
};

export const getUserMomento = async (id: string) => {
    const rsp = await momento.get("momento-demo-users", id)
    const user = rsp.text()
    if (user == null) {
        return null
    }
    return JSON.parse(user)
};


// Utility ----------------
function gen404(event: APIGatewayProxyEvent) {
    return {
        statusCode: 404,
        body: `${event.httpMethod}: ${event.path} not found`
    }
}
