import {isServiceWorker} from "./config";
import {Pushable} from "./execute";
import {ServiceWorkerWorkerData} from "./worker";

export let close = async () => {};

if (isServiceWorker()) {
    const { start } = await import("./start");
    close = await start();
}