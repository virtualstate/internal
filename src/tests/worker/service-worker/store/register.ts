import {DurableServiceWorkerRegistration, FetchFn, serviceWorker} from "../../../../worker";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {FetchStore} from "../fetch-store";

let registration: DurableServiceWorkerRegistration | undefined = undefined;

export const fetch: FetchFn = async (input, init) => {
    if (!registration) {
        const pathname = fileURLToPath(import.meta.url);
        const path = join(dirname(pathname), "./store.js");
        registration = await serviceWorker.register(path)
    }
    return registration.fetch(input, init)
}

export const json = new FetchStore({
    type: "json",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify,
    fetch
})

export const text = new FetchStore({
    type: "text",
    headers: {
        "Content-Type": "text/plain"
    },
    fetch
})

export const formData = new FetchStore({
    type: "formData",
    fetch
})

export const blob = new FetchStore({
    type: "blob",
    fetch
})

export const arrayBuffer = new FetchStore({
    type: "arrayBuffer",
    fetch
})