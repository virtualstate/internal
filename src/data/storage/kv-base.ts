import { requestContext } from "@fastify/request-context";
import { KVS, StorageSchema } from "@kvs/types";
import { kvsEnvStorage } from "@kvs/env";
import { kvsMemoryStorage } from "@kvs/memorystorage";
import { KeyValueStore, KeyValueStoreOptions, MetaKeyValueStore } from "./types";
import { createRedisKeyValueStore } from "./redis-client";
import {isLike, ok} from "../../is";
import {isRedis} from "./redis-client-helpers";
import {getConfig} from "../../config";
import {addKeyValueStoreIndex, deleteKeyValueStoreIndex} from "./store-index";
import {createKVConnectStore, isKVConnect} from "./kv-connect";

const DATABASE_VERSION = 1;

const META_STORE_PREFIX = "meta";

const {
  STORAGE_IN_MEMORY
} = process.env;

interface GenericStorageFn {
  (): Promise<KVS<StorageSchema>>;
}

export const STORE_NAMES = new Set<string>();

export interface StorageConfigFn {
  (store: KeyValueStore<unknown>): KeyValueStore<unknown> | undefined | void;
}

export interface StorageConfig {
  store?: StorageConfigFn;
}

export function getBaseKeyValueStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T> {
  STORE_NAMES.add(name);
  const key = `kvStore#${name}${options?.prefix || ""}`;
  const existing = get();
  if (existing) return existing;
  let store = create();
  const config = getConfig();
  if (config.store) {
    const configured = config.store(store);
    if (isLike<KeyValueStore<T>>(configured)) {
      store = configured;
    }
  }
  requestContext.set(key, store);
  return store;

  function get(): KeyValueStore<T> | undefined {
    return requestContext.get(key);
  }

  function create() {
    let store: Promise<KVS<StorageSchema>>;
    let kv;
    const nextOptions: KeyValueStoreOptions = {
      ...options,
      meta: options?.meta ?? meta
    };
    if (isKVConnect()) {
      kv = createKVConnectStore<T>(name, nextOptions);
    } else if (isRedis()) {
      kv = createRedisKeyValueStore<T>(name, nextOptions);
    } else {
      kv = createKeyValueStore<T>(name, nextOptions, () => {
        if (store) {
          return store;
        }
        const options = {
          // prefix === storage partition
          // for the kvs env, we can get the same effect with a separate name
          // which is mapped to a prefix for a file name anyway...
          name: `${name}${nextOptions?.prefix ? `:${nextOptions.prefix}` : ""}`,
          version: DATABASE_VERSION,
        }
        if (STORAGE_IN_MEMORY) {
          return (store = kvsMemoryStorage(options))
        }
        return (store = kvsEnvStorage(options));
      });
    }
    return kv;

    function meta<M>(key?: string): MetaKeyValueStore<M> {
      return createMetaStore<M>(
          getBaseKeyValueStore,
          name,
          key,
          options
      )
    }
  }
}

export function isMetaStoreName(name: string) {
  return name.includes(`::${META_STORE_PREFIX}`);
}

export function createMetaStore<M>(fn: (name: string, options: KeyValueStoreOptions) => MetaKeyValueStore<M>, name: string, key?: string, options?: KeyValueStoreOptions) {
  return fn(
      `${name}::${META_STORE_PREFIX}`,
      {
        ...options,
        prefix: [options?.prefix, key]
            .filter(Boolean)
            .join(":")
      }
  )
}

function createKeyValueStore<T>(
  name: string,
  options: KeyValueStoreOptions,
  storage: GenericStorageFn
): KeyValueStore<T> {
  const isCounter = name.endsWith("Counter");

  async function postSet() {
    await addKeyValueStoreIndex(name);
  }

  async function noValuesAvailable() {
    await deleteKeyValueStoreIndex(name);
  }

  async function get(key: string): Promise<T | undefined> {
    const store = await storage();
    return store.get(key);
  }

  async function set(key: string, value: T): Promise<void> {
    if (isCounter) {
      ok(typeof value === "number", "Expected number value for counter store");
    }
    const store = await storage();
    await store.set(key, value);
    await postSet();
  }

  async function values(): Promise<T[]> {
    const values = [];
    const store = await storage();
    for await (const [, value] of store) {
      values.push(value);
    }
    if (!values.length) {
      await noValuesAvailable();
    }
    return values;
  }

  async function* asyncIterable(): AsyncIterable<T> {
    const store = await storage();
    let hasValue = false;
    for await (const [, value] of store) {
      yield value;
      hasValue = true
    }
    if (!hasValue) {
      await noValuesAvailable();
    }
  }

  async function deleteFn(key: string): Promise<void> {
    const store = await storage();
    await store.delete(key);
  }

  async function has(key: string): Promise<boolean> {
    const store = await storage();
    return store.has(key);
  }

  async function keys(): Promise<string[]> {
    const keys: string[] = [];
    const store = await storage();
    for await (const [key] of store) {
      if (typeof key === "string") {
        keys.push(key);
      }
    }
    if (!keys.length) {
      await noValuesAvailable();
    }
    return keys;
  }

  async function clear(): Promise<void> {
    const store = await storage();
    for await (const [key] of store) {
      await store.delete(key);
    }
    await noValuesAvailable();
  }

  async function increment(key: string): Promise<number> {
    ok(isCounter, "Expected increment to be used with a counter store only");
    const storedValue = await get(key);
    const currentValue = typeof storedValue === "number" ? storedValue : 0;
    const nextValue = currentValue + 1;
    ok<T>(nextValue);
    await set(key, nextValue);
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
