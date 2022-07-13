import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {LogFormat, LogLevel, SimpleCacheClient} from '@gomomento/sdk';
import {metricScope, MetricsLogger, Unit} from "aws-embedded-metrics";

// Constants ---
const maxTestUsersToMake = 100
const defaultTtl = 60;
const authToken = 'REPLACE_ME';

// Clients --
export const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const momento = new SimpleCacheClient(authToken, defaultTtl, {
    loggerOptions: {
        level: LogLevel.DEBUG,
        format: LogFormat.JSON
    }
});

// Models --
interface User {
    id: string,
    name: string,
    followers: Array<string>,
}

// Router --
export const handler = metricScope(metrics => async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log(`processing request path: ${event.path} method: ${event.httpMethod}`)
    try {
        switch (event.path) {
            case "/bootstrap-users":
                switch (event.httpMethod) {
                    case "POST":
                        return handleBootstrapTestUsers()
                }
                break;
            case "/users":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetUser(event, metrics)
                }
                break;
            case "/cached-users":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetCachedUser(event, metrics)
                }
                break;
            case "/followers":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetFollowers(event, metrics)
                }
                break;
            case "/cached-followers":
                switch (event.httpMethod) {
                    case "GET":
                        return handleGetCachedFollowers(event, metrics)
                }
                break;
        }
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }
    }
    return gen404(event)
});

// handlers ----
const handleBootstrapTestUsers = async () => {
    const returnUsers: Array<User> = [];
    for(let i = 1; i <= maxTestUsersToMake; i++){
        const id = `${i}`;
        const user: User = {
            id,
            name: genName(),
            followers: genFollowers(id),
        }
        await createUser(user)
        returnUsers.push(user)
    }
    return {
        statusCode: 200,
        body: JSON.stringify(returnUsers)
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
    const user = await getUserDDB(userId, mLogger)
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

const handleGetCachedUser = async (event: APIGatewayProxyEvent, mLogger: MetricsLogger): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /cached-users"
        }
    }
    let user = await getCachedUser(userId, mLogger)
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

const handleGetFollowers = async (event: APIGatewayProxyEvent, mLogger: MetricsLogger): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /followers"
        }
    }

    const startTime = Date.now()
    let user = await getUserDDB(userId, mLogger)
    if (!user) {
        return {
            body: "",
            statusCode: 404
        }
    }
    const returnUserPromises: Array<Promise<User>> = []
    user.followers.forEach((u => {
        returnUserPromises.push(getUserDDB(u, mLogger))
    }))
    const rList = await resolveFollowersNames(returnUserPromises)
    mLogger.putMetric("get-followers", Date.now() - startTime, Unit.Milliseconds)
    return {
        statusCode: 200,
        body: JSON.stringify(rList)
    }
}

const handleGetCachedFollowers = async (event: APIGatewayProxyEvent, mLogger: MetricsLogger): Promise<APIGatewayProxyResult> => {
    const userId = event.queryStringParameters?.['id']
    if (!userId) {
        return {
            statusCode: 400,
            body: "must pass user id to /cached-followers"
        }
    }
    const startTime = Date.now()
    let user = await getCachedUser(userId, mLogger)
    if (!user) {
        return {
            body: "",
            statusCode: 404
        }
    }
    const returnUserPromises: Array<Promise<User>> = []
    user.followers.forEach((f => {
        returnUserPromises.push(getCachedUser(f, mLogger))
    }))

    const rList = await resolveFollowersNames(returnUserPromises)
    mLogger.putMetric("get-cached-followers", Date.now() - startTime, Unit.Milliseconds)
    return {
        statusCode: 200,
        body: JSON.stringify(rList)
    }
}

// DAO's ---
const createUser = async (user: User) => {
    await ddbClient.send(new PutCommand({
        TableName: "momento-demo-users",
        Item: user,
    }));
};

const getCachedUser  = async(userId: string, mLogger: MetricsLogger): Promise<User> => {
    const startTime = Date.now();
    let user = await getUserMomento(userId, mLogger)
    if (!user) {
        console.log("no user found in momento fetching from DDB")
        user = await getUserDDB(userId, mLogger)
        // Set item in cache so next time can get faster
        await momento.set("momento-demo-users", userId, JSON.stringify(user))
    }
    return user
}

const getUserDDB = async (id: string, mLogger: MetricsLogger) => {
    const startTime = Date.now()
    const dbRsp = await ddbClient.send(new GetCommand({Key: {id}, TableName: "momento-demo-users"}));
    mLogger.putMetric("ddb-get", Date.now() - startTime, Unit.Milliseconds)
    return dbRsp.Item as User
};

const getUserMomento = async (id: string, mLogger: MetricsLogger) => {
    const startTime = Date.now();
    const rsp = await momento.get("momento-demo-users", id)
    const user = rsp.text()
    if (user == null) {
        return null
    }
    mLogger.putMetric("momento-get", Date.now() - startTime, Unit.Milliseconds)
    return JSON.parse(user)
};


// Utility ----------------
async function resolveFollowersNames(userPromises: Array<Promise<User>>): Promise<Array<String>> {
    const u = await Promise.all(userPromises)
    const rList: Array<String> = []
    u.forEach(ur => {
        rList.push(ur.name)
    })
    return rList
}

function gen404(event: APIGatewayProxyEvent) {
    return {
        statusCode: 404,
        body: `${event.httpMethod}: ${event.path} not found`
    }
}

function genName(): string {
    const firstNames = [
        'excited', 'clingy', 'sad', 'happy', 'strange', 'scared', 'mystical', 'clingy',
        'obnoxious', 'rare', 'dumb', 'goofy', 'angry', 'spacey', 'lazy', 'relaxed',
    ]
    const lastNames = [
        'otter', 'wombat', 'zebra', 'elephant', 'squirrel', 'rabbit', 'frog',
        'rino', 'lion', 'sloth', 'hamster', 'dog', 'cat', 'fish',
    ]
    return `${
        capitalize(firstNames[getRandomInt(0, firstNames.length)])
    } ${
        capitalize(lastNames[getRandomInt(0, lastNames.length)])
    }`;
}

function genFollowers(id: string): Array<string>{
    const returnList = [];
    const followerCount = getRandomInt(50,60)
    for(let i = 0; i < followerCount; i ++){
        const followToAdd = `${getRandomInt(1, maxTestUsersToMake)}`
        if (followToAdd != id){
            returnList.push(`${getRandomInt(1, maxTestUsersToMake)}`)
        }
    }
    return returnList;
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
}