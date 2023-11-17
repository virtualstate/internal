import { ThreadWorker } from "poolifier";
import {onServiceWorkerWorkerData} from "./worker";

export interface ServiceWorkerWorkerData {
    serviceWorkerId: string;
}

class ServiceWorkerWorker extends ThreadWorker<ServiceWorkerWorkerData> {
    constructor() {
        super(data => onServiceWorkerWorkerData(data), {
            maxInactiveTime: 120000
        });
    }
}

export default new ServiceWorkerWorker();