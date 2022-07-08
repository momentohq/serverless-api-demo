import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand} from "@aws-sdk/lib-dynamodb";
import {randomUUID} from "crypto";
import {AlreadyExistsError, LogFormat, LogLevel, SimpleCacheClient,} from '@gomomento/sdk';

export const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const defaultTtl = 60;
const authToken = 'REPLACE_ME';
const momento = new SimpleCacheClient(authToken, defaultTtl, {
    loggerOptions: {
        level: LogLevel.DEBUG,
        format: LogFormat.JSON
    }
});
momento.createCache("momento-demo-users").catch(e => {
    if (!e instanceof AlreadyExistsError) {
        console.log("fatal error occurred creating momento cache" + e);
    }
});


export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        switch (event.path) {
            case "/create-user":
                switch (event.httpMethod) {
                    case "POST":
                        return handleNewUser(event)
                    default:
                        return gen404(event)
                }

            case "/get-user":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetUser(event)
                    default:
                        return gen404(event)
                }
            case "/get-cached-user":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetUser(event)
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

const handleGetUser = async (event: APIGatewayProxyEvent) => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /get-cached-user"
        }
    }
    const user = await getUserDDB(userId)
    if (!user) {
        return {
            statusCode: 404
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify(await getUserDDB(userId))
    }
}

const handleGetCachedUser = async (event: APIGatewayProxyEvent) => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /get-cached-user"
        }
    }
    let user = await getUserMomento(userId)
    if (!user) {
        user = await getUserDDB(userId)
    }
    if (!user) {
        return {
            statusCode: 404
        }
    }
    // Set item in cache so next time can get faster
    await momento.set("momento-demo-users", userId, JSON.stringify(user))
    return {
        statusCode: 200,
        body: JSON.stringify(await getUserDDB(userId))
    }
}

export const createUser = async (user) => {
    await ddbClient.send(new PutCommand({
        TableName: "momento-demo-users",
        Item: user,
    }));
};

export const getUserDDB = async (id) => {
    const dbRsp = await ddbClient.send(new GetCommand({Key: {id}, TableName: "momento-demo-users"}));
    return dbRsp.Item
};

export const getUserMomento = async (id) => {
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
