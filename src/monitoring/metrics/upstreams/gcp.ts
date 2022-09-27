import monitoring from "@google-cloud/monitoring";
import {MetricRecorder, Metrics} from "../metricRecorder";
import {google} from "@google-cloud/monitoring/build/protos/protos";
import ITimeSeries = google.monitoring.v3.ITimeSeries;
import IMetric = google.api.IMetric;


export class GcpMetricStore implements MetricRecorder {
    private readonly metrics: Array<Metrics>
    private client = new monitoring.MetricServiceClient({
        fallback: "rest" // Use REST instead of GRPC since can't get esbuild to work w/ grpc and how they load protos >:(
    });

    constructor() {
        this.metrics = []
    }

    flush(): void {
        const mToFlush: Array<ITimeSeries> = [];
        // Build up metrics to flush
        for (const m of this.metrics) {
            // Add dimensions
            const dimensions: IMetric["labels"] = {};
            for (const l of m.labels) {
                dimensions[l.k] = l.v
            }
            // Add metric and value.
            mToFlush.push({
                metric: {
                    type: 'custom.googleapis.com/demo-api/' + m.name,
                    labels: dimensions,
                },
                resource: {type: 'global', labels: {'project_id': process.env['PROJECT_ID']!!}},
                // TODO figure out how want to pass unit and time down. For now we only support ms and record when flush.
                points: [{interval: {endTime: {seconds: Date.now() / 1000}}, value: {doubleValue: m.value},}],
            })

        }
        this.client.createTimeSeries({
            name: this.client.projectPath(process.env['PROJECT_ID']!!),
            timeSeries: mToFlush,
        }).catch(reason => {
            // FIXME: Hack. Swallow monitoring errors for now "REST" happy path responses not marshaling.
            // come back and look at more figure out what deal is. Metrics being reported so
            // working enough for now.
        })
    }

    record(metricsToRecord: Array<Metrics>): void {
        this.metrics.push(...metricsToRecord)
    }

}