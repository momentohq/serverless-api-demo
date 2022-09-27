import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DataClient} from "../users";
import {getMetricLogger} from "../../../monitoring/metrics/metricRecorder";

// Clients --
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export class UsersDdb implements DataClient {
    async createUser(user: User) {
        await ddbClient.send(new PutCommand({
            TableName: "momento-demo-users",
            Item: user,
        }));
    }

    getUser(userId: string): Promise<User> {
        return getUserDDB(userId)
    }
}

export const getUserDDB =  async (id: string) => {
    const startTime = Date.now()
    const dbRsp = await ddbClient.send(new GetCommand({Key: {id}, TableName: "momento-demo-users"}));
    getMetricLogger().record([{
        value: Date.now() - startTime,
        name: "UpstreamProcessingTime",
        labels: [{k: "upstream", v: "dynamodb"}],
    }])
    return dbRsp.Item as User
};

