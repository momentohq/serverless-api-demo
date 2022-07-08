import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {randomUUID} from "crypto";
import {LogFormat, LogLevel, SimpleCacheClient} from '@gomomento/sdk';

export const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log(`processing request path: ${event.path} method: ${event.httpMethod}`)
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
                        return handleGetUser(event)
                    default:
                        return gen404(event)
                }
            case "/cached-users":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetCachedUser(event)
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
    }
}

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

const handleGetUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /users"
        }
    }
    const user = await getUserDDB(userId)
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

const handleGetCachedUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /cached-users"
        }
    }
    const startTime = Date.now();
    let user = await getUserMomento(userId)
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
