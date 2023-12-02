import {DurableServiceWorkerScope} from "./types";
import {getServiceWorkerId} from "./service-worker-config";

export async function skipWaiting() {
    const serviceWorkerId = getServiceWorkerId();
}