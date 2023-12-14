import {KV_CONNECT_URL} from "../../config";
import {KeyValueStore, KeyValueStoreOptions, MetaKeyValueStore, MetaRecord} from "./types";
import type {Kv} from "@deno/kv";
import {openKv} from "@deno/kv";
import {ok} from "../../is";

export function isKVConnect() {
    return Boolean(KV_CONNECT_URL);
}

export function createKVConnectStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T> {
    let opened: Promise<Kv> | undefined = undefined;
    function open() {
        if (opened) {
            return opened;
        }
        return opened = openKv(KV_CONNECT_URL);
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