import {LogFormat, LogLevel, SimpleCacheClient} from "@gomomento/sdk";
import {getMetricLogger} from "../../monitoring/metrics/metricRecorder";

const authToken = 'REPLACE_ME';
const defaultTtl = 3600;
const momento = new SimpleCacheClient(authToken, defaultTtl, {
    loggerOptions: {
        level: LogLevel.INFO,
        format: LogFormat.JSON
    }
});

export interface Client {
    createUser: (user: User) => Promise<void>
    getCachedUser: (userId: string) => Promise<User>
    getUser: (userId: string) => Promise<User>
}

export interface DataClient {
    createUser: (user: User) => Promise<void>
    getUser: (userId: string) => Promise<User>
}

export class DefaultClient implements Client {
    private dataClient: DataClient

    constructor(dataClient: DataClient) {
        this.dataClient = dataClient;
    }

    async createUser(user: User): Promise<void> {
        return this.dataClient.createUser(user);
    }

    async getCachedUser(userId: string): Promise<User> {
        let user = await getUserMomento(userId)
        if (!user) {
            console.log(`no user found in momento fetching from datastore id=${userId}`)
            user = await this.dataClient.getUser(userId)
            if (!user) {
                throw new Error(`no user found for id=${userId}`)
            }
            // Set item in cache so next time can get faster
            await momento.set("momento-demo-users", userId, JSON.stringify(user))
        }
        return user
    }

    async getUser(userId: string): Promise<User> {
        return this.dataClient.getUser(userId);
    }
}

const getUserMomento = async (id: string) => {
    const startTime = Date.now();
    const rsp = await momento.get("momento-demo-users", id)
    const user = rsp.text()
    if (user == null) {
        return null
    }
    getMetricLogger().record([{
        value: Date.now() - startTime,
        labels: [{k: "upstream", v: "momento"}],
        name: 'Upstream'
    }]);
    return JSON.parse(user)
}
