import {isServiceWorker} from "./config";
import {Pushable} from "./execute";
import {ServiceWorkerWorkerData} from "./worker";

export let worker: Pushable<ServiceWorkerWorkerData, unknown>;

if (isServiceWorker()) {
    const { start } = await import("./start");
    worker = await start();
}

export async function close() {
    await worker?.close();
}