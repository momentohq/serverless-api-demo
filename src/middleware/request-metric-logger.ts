import {createMetricsLogger, Unit} from "aws-embedded-metrics";
import {Request, Response} from "express";
import responseTime from "response-time";

export const metricMiddleware = responseTime(function (req: Request, res:Response, time) {
    const metrics = createMetricsLogger();
    metrics.setDimensions({'API': `${req.method}:/${req.url.split('/', 2)[1]}`});
    metrics.putMetric('ProcessingTime', time, Unit.Milliseconds);
    metrics.flush();
})