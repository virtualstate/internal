import {isServiceWorker} from "./config";
import {ok} from "../../is";
import {SERVICE_WORKER_ID, SERVICE_WORKER_URL} from "../../config";
import {serviceWorker} from "./container";
import {createServiceWorkerWorker} from "./execute";

export async function start() {
    ok(SERVICE_WORKER_ID, "Expected SERVICE_WORKER_ID");
    ok(SERVICE_WORKER_URL, "Expected SERVICE_WORKER_URL");

    // Ensure registered
    await serviceWorker.getRegistration(SERVICE_WORKER_URL);

    const worker = await createServiceWorkerWorker();
    await worker.push({
        serviceWorkerId: SERVICE_WORKER_ID
    });
    return worker;
}