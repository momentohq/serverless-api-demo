// TODO this should be in one of the AWS libs so I can import. Couldnt find it.
export interface AuthorizerRequest {
    type: string;
    methodArn: string;
    resource: string;
    path: string;
    httpMethod: string;
    headers: Headers;
    queryStringParameters: Map<string, string>;
    pathParameters: PathParameters;
    stageVariables: Map<string, string>;
    requestContext: RequestContext;
}
export interface Headers {
    [key: string]: string;
}

export interface PathParameters {
    [key: string]: string;
}

export interface RequestContext {
    path: string;
    accountId: string;
    resourceId: string;
    stage: string;
    requestId: string;
    identity: Identity;
    resourcePath: string;
    httpMethod: string;
    apiId: string;
}

export interface Identity {
    apiKey: string;
    sourceIp: string;
    clientCert: ClientCert;
}

export interface ClientCert {
    clientCertPem: string;
    subjectDN: string;
    issuerDN: string;
    serialNumber: string;
    validity: Validity;
}

export interface Validity {
    notBefore: string;
    notAfter: string;
}

