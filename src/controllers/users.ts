import {genFollowers, genName, genProfilePic, maxTestUsersToMake, resolveFollowersNames} from "../utiltity/utility";
import {Client as UserClient, DefaultClient} from "../repository/users/users";


export class UserHandler {
    userStore: UserClient

    constructor(ur: UserClient) {
        this.userStore = ur;
    }

    async handleBootstrapTestUsers(): Promise<Array<User>> {
        const returnUsers: Array<User> = [];
        for (let i = 0; i < maxTestUsersToMake; i++) {
            const id = `${i}`;
            const user: User = {
                id,
                name: genName(),
                followers: genFollowers(id),
                profile_pic: await genProfilePic(i),
            }
            await this.userStore.createUser(user)
            returnUsers.push(user)
        }
        return returnUsers;
    }

    async handleGetUser(userId: string): Promise<User | null> {
        const user = await this.userStore.getUser(userId)
        // Remove profile pic from user api to cut down on bandwidth. Use GET /images/profile-pics instead
        if (user) {
            delete user.profile_pic
        }
        return user
    }

    async handleGetCachedUser(userId: string): Promise<User | null> {
        const user = await this.userStore.getCachedUser(userId)
        // Remove profile pic from user api to cut down on bandwidth. Use GET /images/profile-pics instead
        if (user) {
            delete user.profile_pic
        }
        return user
    }

    async handleGetFollowers(userId: string): Promise<Array<string>> {
        let user = await this.userStore.getUser(userId)
        if (!user) {
            throw new Error(`no user found userId=${userId}`);
        }
        const returnUserPromises: Array<Promise<User | null>> = []
        user.followers.forEach((u => {
            returnUserPromises.push(this.userStore.getUser(u))
        }))
        return resolveFollowersNames(returnUserPromises)
    }

    async handleGetCachedFollowers(userId: string): Promise<Array<string>> {
        let user = await this.userStore.getCachedUser(userId)
        if (!user) {
            throw new Error(`no user found userId=${userId}`);
        }
        const returnUserPromises: Array<Promise<User | null>> = []
        user.followers.forEach((followerId => {
            returnUserPromises.push(this.userStore.getCachedUser(followerId))
        }))

        return resolveFollowersNames(returnUserPromises)
    }

    async handleGetProfilePic(userId: string): Promise<string | undefined> {
        let user = await this.userStore.getUser(userId)
        if (!user) {
            throw new Error(`no user found userId=${userId}`);
        }
        return user.profile_pic
    }

    async handleGetCachedProfilePic(userId: string): Promise<string | undefined> {
        let user = await this.userStore.getCachedUser(userId)
        if (!user) {
            throw new Error(`no user found userId=${userId}`);
        }
        return user.profile_pic
    }
}
