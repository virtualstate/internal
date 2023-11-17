import {KeyValueStore, KeyValueStoreOptions, MetaKeyValueStore} from "./types";
import {ok} from "../../is";

export function createMemoryStore<T>(name: string, options: KeyValueStoreOptions): KeyValueStore<T> {
    const map = new Map<string, T>();

    const isCounter = name.endsWith("Counter");

    async function get(key: string): Promise<T | undefined> {
        return map.get(key);
    }

    async function set(key: string, value: T): Promise<void> {
        if (isCounter) {
            ok(typeof value === "number", "Expected number value for counter store");
        }
        map.set(key, value);
    }

    async function values(): Promise<T[]> {
        return [...map.values()];
    }

    async function* asyncIterable(): AsyncIterable<T> {
        for (const value of map.values()) {
            yield value;
        }
    }

    async function deleteFn(key: string): Promise<void> {
        map.delete(key);
    }

    async function has(key: string): Promise<boolean> {
        return map.has(key);
    }

    async function keys(): Promise<string[]> {
        return [...map.keys()]
    }

    async function clear(): Promise<void> {
        map.clear();
    }

    async function increment(key: string): Promise<number> {
        ok(isCounter, "Expected increment to be used with a counter store only");
        const storedValue = map.get(key);
        const currentValue = typeof storedValue === "number" ? storedValue : 0;
        const nextValue = currentValue + 1;
        ok<T>(nextValue);
        map.set(key, nextValue);
        return nextValue;
    }

    function meta<M>(key?: string): MetaKeyValueStore<M> {
        const fn = options?.meta;
        ok(fn, "expected meta option to be provided if meta is used");
        return fn<M>(key);
    }

    return {
        name,
        get,
        set,
        values,
        delete: deleteFn,
        has,
        keys,
        clear,
        increment,
        meta,
        [Symbol.asyncIterator]() {
            return asyncIterable()[Symbol.asyncIterator]();
        },
    };
}