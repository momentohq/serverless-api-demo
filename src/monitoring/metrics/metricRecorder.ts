import {GcpMetricStore} from "./upstreams/gcp";
import {AwsMetricStore} from "./upstreams/aws";

export type Metrics = {
    value: number,
    name: string,
    labels: Array<{ k: string, v: string}>
}

export interface MetricRecorder{
    record(metricsToRecord: Array<Metrics>): void
    flush(): void
}

export class DefaultMetricClient implements MetricRecorder {
    private metricStore: MetricRecorder
    constructor(metricStore: MetricRecorder) {
        this.metricStore = metricStore
    }

    flush(): void {
        this.metricStore.flush()
    }

    record(metricsToRecord: Array<Metrics>): void {
        this.metricStore.record(metricsToRecord);
    }
}

let mLogger: MetricRecorder;

export function getMetricLogger() {
    if (process.env['RUNTIME'] == 'GCP') {
        if (!mLogger){
            mLogger = new DefaultMetricClient(new GcpMetricStore());
        }
    }else{
        if(!mLogger){
            mLogger = new DefaultMetricClient(new AwsMetricStore());
        }
    }
    return mLogger
}