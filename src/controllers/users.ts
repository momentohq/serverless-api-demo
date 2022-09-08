import {createUser, getCachedUser, getUserDDB} from "../repository/users";
import {genFollowers, genName, genProfilePic, maxTestUsersToMake, resolveFollowersNames} from "../utiltity/utility";

export const handleBootstrapTestUsers = async (): Promise<Array<User>> => {
    const returnUsers: Array<User> = [];
    for(let i = 0; i < maxTestUsersToMake; i++){
        const id = `${i}`;
        const user: User = {
            id,
            name: genName(),
            followers: genFollowers(id),
            profile_pic: await genProfilePic(i),
        }
        await createUser(user)
        returnUsers.push(user)
    }
    return returnUsers;
}

export const handleGetUser = async (userId: string): Promise<User> => {
    const user = await getUserDDB(userId)
    // Remove profile pic from user api to cut down on bandwidth. Use GET /images/profile-pics instead
    delete user.profile_pic
    return user
}

export const handleGetCachedUser = async (userId: string): Promise<User> => {
    const user = await getCachedUser(userId)
    // Remove profile pic from user api to cut down on bandwidth. Use GET /images/profile-pics instead
    delete user.profile_pic
    return user

}

export const handleGetFollowers = async (userId: string): Promise<Array<string>> => {
    let user = await getUserDDB(userId)
    // FIXME handle no user found
    const returnUserPromises: Array<Promise<User>> = []
    user.followers.forEach((u => {
        returnUserPromises.push(getUserDDB(u))
    }))
    return resolveFollowersNames(returnUserPromises)
}

export const handleGetCachedFollowers = async (userId: string): Promise<Array<string>> => {
    let user = await getCachedUser(userId)
    // FIXME handle no user found

    const returnUserPromises: Array<Promise<User>> = []
    user.followers.forEach((f => {
        returnUserPromises.push(getCachedUser(f))
    }))

    return resolveFollowersNames(returnUserPromises)
}

export const handleGetProfilePic = async (userId: string): Promise<string | undefined> => {
    let user = await getUserDDB(userId)
    // FIXME handle no user found
    return user.profile_pic
}

export const handleGetCachedProfilePic = async (userId: string): Promise<string | undefined> => {
    let user = await getCachedUser(userId)
    // FIXME handle no user found
    return user.profile_pic
}

