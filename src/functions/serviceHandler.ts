import serverlessExpress from "@vendia/serverless-express";
import {app} from "../service/app";

export const handler = serverlessExpress({ app });
