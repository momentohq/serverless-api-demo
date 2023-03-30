import {AuthorizerRequest} from "../models/authorizer";
import {DefaultClient} from "../repository/users/users";
import {UsersDdb} from "../repository/users/data-clients/ddb";
import {getMetricLogger} from "../monitoring/metrics/metricRecorder";

const ALLOW = 'Allow', DENY = 'Deny';
const ur = new DefaultClient(new UsersDdb());

export const handler = async (event: AuthorizerRequest): Promise<any> => {
    const methodArn = event.methodArn;
    try {
        return await customAuthLogic(event.headers['Authorization'], methodArn, event.pathParameters['id'])
    } catch (error) {
        console.error(`fatal error occurred in authorizer err=${JSON.stringify(error)}`);
        throw new Error('Server Error'); // 500.
    }
}

const customAuthLogic = async (authToken: string, methodArn: string, requestedUserId: string): Promise<any> => {
    const startTime = Date.now()
    // Note: in a real api we would want to do a validation check(AuthN) first against passed 'authToken' to get
    // the verified user id. Since this is just a simple demo we blindly trust the passed simple ID value.
    //   ex:       Authorization: 1

    // Now perform custom app Authz logic here were checking if the requesting user is a follower of the
    // requested profile pic owner based off path parameter in api for resource.

    let user: null | User;
    if (process.env["CACHE_ENABLED"] === 'true') {
        user = await ur.getCachedUser(requestedUserId);
    } else {
        user = await ur.getUser(requestedUserId);
    }
    if (!user) {
        throw new Error(`no user found requestedUserId=${requestedUserId}`);
    }

    if (user.followers.indexOf(authToken) < 0) {
        console.info(`non follower tried to access a profile pic requestedResourceUserId=${user.id} requestingUser=${authToken}`);
        return generateAuthorizerRsp(authToken, DENY, methodArn, {})
    }
    console.info(`successfully authenticated resource request requestedResourceUserId=${user.id} requestingUser=${authToken}`);
    getMetricLogger().record([{
        value: Date.now() - startTime,
        labels: [{k: "CacheEnabled", v: `${process.env["CACHE_ENABLED"]}`}],
        name: "authTime"
    }]);
    getMetricLogger().flush();
    return generateAuthorizerRsp(authToken, ALLOW, methodArn, {id: authToken})
}

const generateAuthorizerRsp = (principalId: string, Effect: string, Resource: string, context: any) => ({
    principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [{Action: 'execute-api:Invoke', Effect, Resource}],
    },
    context,
});