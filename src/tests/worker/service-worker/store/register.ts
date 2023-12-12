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

type FetchStoreRequestInit = Omit<RequestInit, "body" | "method">

interface FetchStoreBodyFn<RecordType extends FetchStoreRecordType> {
    (value: FetchStoreRecordTypeType<RecordType>): RequestInit["body"]
}

interface FetchStoreOptions<RecordType extends FetchStoreRecordType> extends FetchStoreRequestInit {
    type: RecordType;
    fetch: FetchFn;
    body?: FetchStoreBodyFn<RecordType>
}

function mergeHeaders(...items: HeadersInit[]) {
    const headers = new Headers(items[0]);
    for (let index = 1; index < items.length; index += 1) {
        const item = items[index];
        if (!item) continue;
        const next = new Headers(item);
        next.forEach((value, key) => {
           headers.set(key, value);
        });
    }
    return headers;
}

export class FetchStore<RecordType extends FetchStoreRecordType, T extends FetchStoreRecordTypeType<RecordType> = FetchStoreRecordTypeType<RecordType>> {

    readonly type: RecordType;

    private readonly fetch: FetchFn;
    private readonly body: FetchStoreBodyFn<RecordType> | undefined;
    private readonly init: FetchStoreRequestInit;

    constructor({ type, body, fetch, ...init }: FetchStoreOptions<RecordType>) {
        this.type = type;
        this.body = body;
        this.fetch = fetch;
        this.init = init;
    }

    with<Z extends T>(options: Partial<Omit<FetchStoreOptions<RecordType>, "type">>) {
        return new FetchStore<RecordType, Z>({
            type: this.type,
            body: this.body,
            fetch: this.fetch,
            ...options
        })
    }

    async post(type: string | URL, value: T, init?: FetchStoreRequestInit): Promise<string> {
        const response = await fetch(type, {
            ...this.init,
            ...init,
            method: "post",
            body: this.body?.(value) ?? value,
            headers: mergeHeaders(this.init.headers, init?.headers)
        });
        ok(response.ok);
        return response.headers.get("Location");
    }

    async put(url: string | URL, value: T, init?: FetchStoreRequestInit) {
        const response = await fetch(url, {
            ...this.init,
            ...init,
            method: "put",
            body: this.body?.(value) ?? value,
            headers: mergeHeaders(this.init.headers, init?.headers)
        });
        ok(response.ok);
    }

    async patch<Z extends T = T>(url: string | URL, value: T, init?: FetchStoreRequestInit): Promise<Z> {
        const response = await fetch(url, {
            ...init,
            method: "patch",
            body: this.body?.(value) ?? value,
            headers: mergeHeaders(this.init.headers, init?.headers)
        });
        ok(response.ok);
        return response[this.type]()
    }

    async delete(url: string, init?: FetchStoreRequestInit) {
        const response = await fetch(url, {
            ...this.init,
            ...init,
            method: "delete",
            headers: mergeHeaders(this.init.headers, init?.headers)
        });
        ok(response.ok);
    }

    async get<Z extends T = T>(urlOrType?: string | URL, init?: FetchStoreRequestInit): Promise<Z> {
        const response = await fetch(urlOrType || "/", {
            ...this.init,
            ...init,
            method: "get",
            headers: mergeHeaders(this.init.headers, init?.headers)
        });
        ok(response.ok);
        return response[this.type]();
    }

    async head(url: string | URL, init?: FetchStoreRequestInit) {
        const response = await fetch(url, {
            ...this.init,
            ...init,
            method: "head",
            headers: mergeHeaders(this.init.headers, init?.headers)
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