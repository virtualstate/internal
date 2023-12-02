import {DurableServiceWorkerScope} from "./types";
import {SERVICE_WORKER_ID} from "../../config";

declare var self: DurableServiceWorkerScope;

export function getServiceWorkerId() {
    if (typeof self !== "undefined") {
        if (self.registration?.durable) {
            return self.registration.durable.serviceWorkerId;
        }
    }
    return SERVICE_WORKER_ID;
}