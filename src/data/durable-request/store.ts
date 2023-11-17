import {getExpiringStore} from "../expiring-kv";
import {DurableRequest} from "./types";

const STORE_NAME = "request" as const;

export interface DurableRequestStoreOptions {
    name?: string;
    prefix?: string;
}

export function getDurableRequestStore({ name, prefix }: DurableRequestStoreOptions = {}) {
    return getExpiringStore<DurableRequest>(name || STORE_NAME, {
        counter: false,
        prefix
    });
}