import {KV_CONNECT_ACCESS_TOKEN, KV_CONNECT_URL} from "../../config";
import {KeyValueStore, KeyValueStoreOptions, MetaKeyValueStore, MetaRecord} from "./types";
import type {Kv} from "@deno/kv";
import {ok} from "../../is";

const GLOBAL_CLIENTS = new Map();
const GLOBAL_CLIENTS_PROMISE = new Map();

export function getGlobalKVConnectClient(): Promise<Kv> {
    const url: string = KV_CONNECT_URL;
    // Give a stable promise result so it can be used to cache on too
    const existing = GLOBAL_CLIENTS_PROMISE.get(url);
    if (existing) {
        return existing;
    }
    const promise = getClient();
    GLOBAL_CLIENTS_PROMISE.set(url, promise);
    return promise;

    async function getClient(): Promise<Kv> {
        const { openKv } = await import("@deno/kv");
        const { serialize: encodeV8, deserialize: decodeV8 } = await import("node:v8");

        const client = await openKv(KV_CONNECT_URL, {
            accessToken: KV_CONNECT_ACCESS_TOKEN,
            encodeV8,
            decodeV8
        })
        // client.on("error", console.warn);
        GLOBAL_CLIENTS.set(url, client);
        return client;
    }
}

export function isKVConnect() {
    return Boolean(KV_CONNECT_URL);
}

export function createKVConnectStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T> {
    function open() {
        return getGlobalKVConnectClient();
    }

    const namespace = [name, options.prefix || false];

    async function * entries() {
        const client = await open();
        const values = client.list<T>({
            prefix: namespace
        });
        for await (const result of values) {
            const key = result.key.at(-1);
            if (typeof key !== "string") continue;
            yield [key, result.value] as const
        }
    }

    return {
        name,
        async * [Symbol.asyncIterator](): AsyncIterator<T> {
            for await (const [, value] of entries()) {
                yield value;
            }
        },
        async get(key: string): Promise<T | undefined> {
            const client = await open();
            const result = await client.get<T>([...namespace, key]);
            return result.value ?? undefined;
        },
        async set<T>(key: string, value: T): Promise<void> {
            const client = await open();
            await client.set([...namespace, key], value);
        },
        async values(): Promise<T[]> {
            let values: T[] = [];
            for await (const [, value] of entries()) {
                values.push(value);
            }
            return values;
        },
        async clear(): Promise<void> {
            const client = await open();
            for await (const [key] of entries()) {
                await client.delete([...namespace, key]);
            }
        },
        async delete(key: string): Promise<void> {
            const client = await open();
            await client.delete([...namespace, key]);
        },
        async has(key: string): Promise<boolean> {
            const client = await open();
            const result = await client.get([...namespace, key]);
            return result.value !== null
        },
        async increment(key: string): Promise<number> {
            const client = await open();
            const result = await client.get([...namespace, key]);
            let value;
            if (typeof result.value === "number") {
                value = result.value + 1;
            } else {
                value = 1;
            }
            await client.set([...namespace, key], value);
            return value;
        },
        async keys(): Promise<string[]> {
            let keys: string[] = [];
            for await (const [key] of entries()) {
                keys.push(key);
            }
            return keys;
        },
        meta<M = MetaRecord>(key?: string): MetaKeyValueStore<M> {
            const fn = options?.meta;
            ok(fn, "expected meta option to be provided if meta is used");
            return fn<M>(key);
        }
    }
}

export function stopKVConnect() {
    for (const [key, promise] of GLOBAL_CLIENTS_PROMISE.entries()) {
        const client = GLOBAL_CLIENTS.get(key)
        deleteKey(key);
        if (client) {
            client.close();
        } else {
            // If we didn't yet set the client, but we have a promise active
            // reset all the clients again
            //
            // Its okay if we over do this, we will "just" make a new client
            promise.then(
                (client: Kv) => {
                    // If it resolved but it's not set, we made a new promise over the top already
                    // so we don't want to reset it
                    if (GLOBAL_CLIENTS.get(key) === client) {
                        deleteKey(key);
                    }
                    client.close();
                },
                () => {
                    // If we got an error, delete either way
                    deleteKey(key);
                }
            )
        }

        function deleteKey(key: string) {
            GLOBAL_CLIENTS.delete(key);
            GLOBAL_CLIENTS_PROMISE.delete(key);
        }
    }
}