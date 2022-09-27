import {Request, Response} from "express";
import responseTime from "response-time";
import {getMetricLogger} from "../monitoring/metrics/metricRecorder";

export const metricMiddleware = responseTime(function (req: Request, res: Response, time) {
    const mLogger = getMetricLogger()
    mLogger.record([{
        name: "ProcessingTime",
        value: time,
        labels: [{k: "API", v: `${req.method}:/${req.url.split('/', 2)[1]}`}],
    }])
    mLogger.flush();
})