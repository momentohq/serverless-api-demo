import {Firestore} from "@google-cloud/firestore";
import {DataClient} from "../users";
import {getMetricLogger} from "../../../monitoring/metrics/metricRecorder";

// Clients --
const firestore = new Firestore({
    projectId: process.env['PROJECT_ID'],
    preferRest: true, // Drops response times by 3x for some reason using rest vs grpc for firestore sdk?
});

export class UsersFirestore implements DataClient {
    async createUser(user: User): Promise<void> {
        await firestore.collection(`users`).doc(user.id).set(user)
    }

    async getUser(userId: string): Promise<User> {
        const startTime = Date.now();
        const dbRsp = await firestore.collection(`users`).doc(userId).get();
        getMetricLogger().record([{
            value: Date.now() - startTime,
            labels: [{k: "upstream", v: "firestore"}],
            name: 'Upstream'
        }])
        return dbRsp.data() as User
    }
}