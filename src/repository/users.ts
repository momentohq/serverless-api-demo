import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {Unit, metricScope} from "aws-embedded-metrics";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {LogFormat, LogLevel, SimpleCacheClient} from "@gomomento/sdk";

const defaultTtl = 3600;
const authToken = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJlYXdAbW9tZW50b2hxLmNvbSIsImNwIjoiY29udHJvbC5jZWxsLXVzLWVhc3QtMS0xLnByb2QuYS5tb21lbnRvaHEuY29tIiwiYyI6ImNhY2hlLmNlbGwtdXMtZWFzdC0xLTEucHJvZC5hLm1vbWVudG9ocS5jb20ifQ.ZSXM4VfnCDvqmFXni9DqRBY1vi6XBwpYE5EFkVXDN4QLm6gt2f-GQIGcxi5H65InOOpBWVM1bERfYMPEDzJpjA';

// Clients --
export const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const momento = new SimpleCacheClient(authToken, defaultTtl, {
    loggerOptions: {
        level: LogLevel.DEBUG,
        format: LogFormat.JSON
    }
});

export const createUser = async (user: User) => {
    await ddbClient.send(new PutCommand({
        TableName: "momento-demo-users",
        Item: user,
    }));
};

export const getCachedUser  = async(userId: string): Promise<User> => {
    let user = await getUserMomento(userId)
    if (!user) {
        console.log(`no user found in momento fetching from DDB id=${userId}`)
        user = await getUserDDB(userId)
        if (!user){
            throw new Error(`no user found for id=${userId}`)
        }
        // Set item in cache so next time can get faster
        await momento.set("momento-demo-users", userId, JSON.stringify(user))
    }
    return user
}

export const getUserDDB = metricScope(metrics => async (id: string) => {
    const startTime = Date.now()
    const dbRsp = await ddbClient.send(new GetCommand({Key: {id}, TableName: "momento-demo-users"}));
    metrics.setDimensions({"Upstream": "dynamodb"})
    metrics.putMetric("ProcessingTime", Date.now() - startTime, Unit.Milliseconds)
    return dbRsp.Item as User
});

export const getUserMomento = metricScope(metrics => async (id: string) => {
    const startTime = Date.now();
    const rsp = await momento.get("momento-demo-users", id)
    const user = rsp.text()
    if (user == null) {
        return null
    }
    metrics.setDimensions({"Upstream": "momento"})
    metrics.putMetric("ProcessingTime", Date.now() - startTime, Unit.Milliseconds)
    return JSON.parse(user)
});
