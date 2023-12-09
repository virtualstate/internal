import {DurableServiceWorkerRegistration, FetchFn, serviceWorker} from "../../../../worker";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {ok} from "../../../../is";

let registration: DurableServiceWorkerRegistration | undefined = undefined;

export const fetch: FetchFn = async (input, init) => {
    if (!registration) {
        const pathname = fileURLToPath(import.meta.url);
        const path = join(dirname(pathname), "./store.js");
        registration = await serviceWorker.register(path)
    }
    return registration.fetch(input, init)
}

export const json = {
    async post(type: string, value: unknown) {
        const response = await fetch(`/${type}`, {
            method: "post",
            body: JSON.stringify(value),
            headers: {
                "Content-Type": "application/json"
            }
        });
        ok(response.ok);
        return response.headers.get("Location");
    },
    async put(url: string, value: unknown) {
        const response = await fetch(url, {
            method: "put",
            body: JSON.stringify(value),
            headers: {
                "Content-Type": "application/json"
            }
        });
        ok(response.ok);
    },
    async patch(url: string, value: unknown) {
        const response = await fetch(url, {
            method: "patch",
            body: JSON.stringify(value),
            headers: {
                "Content-Type": "application/json"
            }
        });
        ok(response.ok);
        return response.json();
    },
    async delete(url: string) {
        const response = await fetch(url, {
            method: "delete"
        });
        ok(response.ok);
    },
    async get(urlOrType?: string) {
        const response = await fetch(urlOrType || "/", {
            method: "get"
        });
        ok(response.ok);
        return response.json();
    },
    async head(url: string) {
        const response = await fetch(url, {
            method: "head"
        });
        ok(response.ok);
        return response.headers;
    }
}


export const text = {
    async post(type: string, value: string) {
        const response = await fetch(`/${type}`, {
            method: "post",
            body: value,
            headers: {
                "Content-Type": "text/plain"
            }
        });
        ok(response.ok);
        return response.headers.get("Location");
    },
    async put(url: string, value: string) {
        const response = await fetch(url, {
            method: "put",
            body: value,
            headers: {
                "Content-Type": "text/plain"
            }
        });
        ok(response.ok);
    },
    async delete(url: string) {
        const response = await fetch(url, {
            method: "delete"
        });
        ok(response.ok);
    },
    async get(urlOrType?: string) {
        const response = await fetch(urlOrType || "/", {
            method: "get"
        });
        ok(response.ok);
        return response.text();
    },
    async head(url: string) {
        const response = await fetch(url, {
            method: "head"
        });
        ok(response.ok);
        return response.headers;
    }
}