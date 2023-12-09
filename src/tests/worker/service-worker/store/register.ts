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

export type FetchStoreRecordType = "json" | "text" | "blob" | "arrayBuffer" | "formData";
export type FetchStoreRecordTypeType<T extends FetchStoreRecordType> = Awaited<ReturnType<Response[T]>>

interface FetchStoreOptions<RecordType extends FetchStoreRecordType> {
    headers: Record<string, string>
    type: RecordType;
    body?(value: FetchStoreRecordTypeType<RecordType>): RequestInit["body"]
}

class FetchStore<RecordType extends FetchStoreRecordType, T extends FetchStoreRecordTypeType<RecordType> = FetchStoreRecordTypeType<RecordType>> {

    constructor(private options: FetchStoreOptions<RecordType>) {
    }

    async post(type: string, value: T): Promise<string> {
        const response = await fetch(`/${type}`, {
            method: "post",
            body: this.options?.body?.(value) ?? value,
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
        return response.headers.get("Location");
    }

    async put(url: string, value: T) {
        const response = await fetch(url, {
            method: "put",
            body: this.options?.body?.(value) ?? value,
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
    }

    async patch(url: string, value: T) {
        const response = await fetch(url, {
            method: "patch",
            body: this.options?.body?.(value) ?? value,
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
    }

    async delete(url: string) {
        const response = await fetch(url, {
            method: "delete",
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
    }

    async get(urlOrType?: string): Promise<T> {
        const response = await fetch(urlOrType || "/", {
            method: "get",
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
        return response[this.options.type]();
    }

    async head(url: string) {
        const response = await fetch(url, {
            method: "head",
            headers: {
                ...this.options.headers
            }
        });
        ok(response.ok);
        return response.headers;
    }
}

export const json = new FetchStore({
    type: "json",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify
})

export const text = new FetchStore({
    type: "text",
    headers: {
        "Content-Type": "text/plain"
    }
})