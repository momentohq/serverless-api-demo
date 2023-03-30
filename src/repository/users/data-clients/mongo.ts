import {DataClient} from "../users";
import {getMetricLogger} from "../../../monitoring/metrics/metricRecorder";
import mongoose from 'mongoose';
import { Schema, model, connect } from 'mongoose';


// Clients --
const userSchema = new Schema<User>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    followers: [{ type: String, required: true }],
    profile_pic: String
});

const User = model<User>('User', userSchema);

export class UsersMongo implements DataClient {
    constructor() {
        connect(`REPLACE_ME`, { connectTimeoutMS: 1000 })
            .catch(err => console.log(err))
    }
    async createUser(user: User) {
        const userToSave = new User({
            id: user.id,
            name: user.name,
            followers: user.followers,
            profile_pic: user.profile_pic
        });
        // Override mongo internal _id to match user id
        userToSave._id = new mongoose.Types.ObjectId(user.id);
        await userToSave.save()
    }

    getUser(userId: string): Promise<User | null> {
        return getUserMongo(userId)
    }
}

export const getUserMongo = async (id: string) => {
    const startTime = Date.now()
    const dbRsp = await User.findById(new mongoose.Types.ObjectId(id))
    getMetricLogger().record([{
        value: Date.now() - startTime,
        name: "UpstreamProcessingTime",
        labels: [{k: "upstream", v: "mongo"}],
    }])
    if (!dbRsp) {
        return null
    }
    return {
        id: dbRsp.id,
        name: dbRsp.name,
        profile_pic: dbRsp.profile_pic,
        followers: dbRsp.followers
    } as User
}
