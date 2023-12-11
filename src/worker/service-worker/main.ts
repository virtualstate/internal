import {isServiceWorker} from "./config";

export let close = async () => {};

if (isServiceWorker()) {
    const { start } = await import("./start");
    close = await start();
}