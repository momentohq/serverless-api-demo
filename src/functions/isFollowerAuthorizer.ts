import {AuthorizerRequest} from "../models/authorizer";
import {DefaultClient} from "../repository/users/users";
import {UsersDdb} from "../repository/users/data-clients/ddb";

const ALLOW = 'Allow'
const DENY = 'Deny'

const ur = new DefaultClient(new UsersDdb());

const customAuthzLogic = async (authToken: string, requestedUserId: string): Promise<any> => {
    // Note: in a real api we would want to do an authN check first against passed 'authToken' to get
    // verified user id. Since this is just a simple demo we blindly trust passed simple ID value.
    //   ex:       Authorization: 1

    // Now perform custom app Authz logic here were checking if the requesting user is a follower of the
    // requested profile pic owner based off path parameter in api for resource.
    const user = await ur.getCachedUser(requestedUserId) // TODO build way to toggle between cache on and off
    if (user.followers.indexOf(authToken) < 0) {
        console.info(`non follower tried to access a profile pic requestedUserId=${user.id} requestingUser=${authToken}`);
        throw new Error('cant access users profile pic who your not following');
    }

    return {
        id: authToken
    }
}

const generateIamPolicy = (principalId: string, Effect: string, Resource: string, context: any) => ({
    principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [{Action: 'execute-api:Invoke', Effect, Resource}],
    },
    context,
});

export const handler = async (event: AuthorizerRequest): Promise<any> => {
    const methodArn = event.methodArn;
    try {
        const authToken = event.headers['Authorization']
        const user = await customAuthzLogic(authToken, event.pathParameters['id']);
        console.info(`Authorized ${user.id} as ${JSON.stringify(user)}`);
        return generateIamPolicy(user.id, ALLOW, methodArn, user)
    } catch (error) {
        if (!error) {
            throw new Error('Unauthorized'); // 401.
        }
        console.error(`Unable to authorise because of: ${JSON.stringify(error)}`);
        throw new Error('Server Error'); // 500.
    }
}

