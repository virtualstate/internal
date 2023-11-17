import {KeyValueStore, KeyValueStoreOptions} from "./types";
import { getBaseKeyValueStore } from "./kv-base";
import {getConfig} from "../../config";

export const GLOBAL_STORE_NAME = "global";
export const GLOBAL_COUNT_NAME = "globalCount";

export interface KeyValueStoreConfig {
  getKeyValueStore?<T>(
      name: string,
      options?: KeyValueStoreOptions
  ): KeyValueStoreWithCounter<T> | KeyValueStore<T>;
}

export interface KeyValueStoreWithCounter<T> extends KeyValueStore<T> {
  counters: {
    store: KeyValueStore<number>;
    global: KeyValueStore<number>;
  };
}


export function getKeyValueStore<T>(
  name: string,
  options: KeyValueStoreOptions & { counter: true }
): KeyValueStoreWithCounter<T>;
export function getKeyValueStore<T>(
    name: string,
    options?: KeyValueStoreOptions
): KeyValueStore<T>;
export function getKeyValueStore<T>(
  name: string,
  options?: KeyValueStoreOptions
): KeyValueStore<T> & Partial<KeyValueStoreWithCounter<T>> {
  const config = getConfig();
  if (config.getKeyValueStore) {
    return config.getKeyValueStore(name, options);
  }
  const store = getBaseKeyValueStore<T>(name, options);
  const counters =
    options?.counter === true
      ? {
          store: getCounterStore(name),
          global: getGlobalCounterStore(),
        }
      : undefined;
  return {
    ...store,
    counters,
    async set(key: string, value: T) {
      await counters?.global.increment(GLOBAL_COUNT_NAME);
      await counters?.store.increment(key);
      return store.set(key, value);
    },
    async delete(key: string) {
      await counters?.store.delete(key);
      return store.delete(key);
    },
    async clear() {
      await counters?.global.clear();
      await counters?.store.clear();
      return store.clear();
    }
  };
}

export function getCounterStoreName(baseName: string): `${string}Counter` {
  return `${baseName}Counter`;
}

export function getCounterStore(name: string): KeyValueStore<number> {
  return getBaseKeyValueStore<number>(getCounterStoreName(name));
}

export function getGlobalCounterStore() {
  return getCounterStore(GLOBAL_STORE_NAME);
}

export async function getGlobalCount() {
  const store = getGlobalCounterStore();
  const count = await store.get(GLOBAL_COUNT_NAME);
  if (typeof count !== "number") {
    return -1;
  }
  return count;
}
