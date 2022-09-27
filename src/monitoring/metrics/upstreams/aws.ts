import {createMetricsLogger, Unit, } from "aws-embedded-metrics";
import {MetricRecorder, Metrics} from "../metricRecorder";

export class AwsMetricStore implements MetricRecorder{
    private readonly metrics: Array<Metrics>

    constructor() {
        this.metrics = []
    }
    flush(): void {
        const mLogger = createMetricsLogger();
        // Build up metrics to flush
        for (const m of this.metrics) {
            // Add dimensions
            const dimensions: Array<Record<string, string>> = [];
            for (const l of m.labels){
                dimensions.push({[l.k]: l.v})
            }
            mLogger.setDimensions(...dimensions)
            // Add metric and value. TODO figure out how want to pass unit down. For now we only support ms.
            mLogger.putMetric(m.name, m.value, Unit.Milliseconds)
        }
        mLogger.flush()
    }

    record(metricsToRecord: Array<Metrics>): void {
        this.metrics.push(...metricsToRecord)
    }

}