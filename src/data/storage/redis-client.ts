import {KeyValueStore, KeyValueStoreOptions, MetaKeyValueStore} from "./types";
import { ok, isNumberString } from "../../is";
import type { Redis as RedisClientType } from "ioredis";
import type { RedisClient } from "./redis-types";
import {getRedisPrefix, getRedisPrefixedKey, getRedisUrl} from "./redis-client-helpers";
import {addKeyValueStoreIndex, deleteKeyValueStoreIndex} from "./store-index";

export { RedisClient }

const GLOBAL_CLIENTS = new Map();
const GLOBAL_CLIENTS_PROMISE = new Map();
const GLOBAL_CLIENT_CONNECTION_PROMISE = new WeakMap();

const DEFAULT_SCAN_SIZE = 42;

export function getGlobalRedisClient(): Promise<RedisClient> {
  const url: string = getRedisUrl();
  // Give a stable promise result so it can be used to cache on too
  const existing = GLOBAL_CLIENTS_PROMISE.get(url);
  if (existing) {
    return existing;
  }
  const promise = getClient();
  GLOBAL_CLIENTS_PROMISE.set(url, promise);
  return promise;

  async function getClient(): Promise<RedisClient> {
    const ioredis = await import("ioredis");
    const params = [url];
    ok<ConstructorParameters<typeof ioredis.Redis>>(params);
    const client = ioredis.Redis.createClient(...params)
    // client.on("error", console.warn);
    GLOBAL_CLIENTS.set(url, client);
    return client;
  }
}

// export async function connectGlobalRedisClient(
//     clientPromise: Promise<RedisClient> = getGlobalRedisClient()
// ): Promise<RedisClient> {
//   try {
//
//     const client =  await clientPromise;
//     console.log({ client });
//     return client;
//   } catch (error ) {
//     console.error({ error });
//     throw error;
//   }
//   // if (client.isOpen) {
//   //   return client;
//   // }
//   // const existingPromise = GLOBAL_CLIENT_CONNECTION_PROMISE.get(client);
//   // if (existingPromise) return existingPromise;
//   // const promise = client.connect().then(() => client);
//   // GLOBAL_CLIENT_CONNECTION_PROMISE.set(client, promise);
//   // promise.finally(() => {
//   //   if (promise === GLOBAL_CLIENT_CONNECTION_PROMISE.get(client)) {
//   //     GLOBAL_CLIENT_CONNECTION_PROMISE.delete(client);
//   //   }
//   // });
//   // return promise;
// }

// export async function getRedisClient() {
//     const client = getGlobalRedisClient();
//     await connectGlobalRedisClient(client);
//     return client;
// }

export function createRedisKeyValueStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T> {
  const clientPromise = getGlobalRedisClient();

  let client: RedisClient;

  const isCounter = name.endsWith("Counter");

  async function postSet() {
    await addKeyValueStoreIndex(name);
  }

  async function noValuesAvailable() {
    await deleteKeyValueStoreIndex(name);
  }

  function parseValue(value: unknown): T | undefined {
    if (isCounter) {
      return parseCounterValue(value);
    }

    if (typeof value !== "string") {
      return undefined;
    }

    return JSON.parse(value);

    function parseCounterValue(value: unknown): T {
      let returnValue = 0;
      if (isNumberString(value)) {
        returnValue = +value;
      }
      ok<T>(returnValue);
      return returnValue;
    }
  }

  function getPrefix() {
    return getRedisPrefix(name, options);
  }

  function getKey(key: string): string {
    return getRedisPrefixedKey(name, key, options);
  }

  async function connect() {
    if (client) {
      return client;
    }
    client = await clientPromise;
    return client;
    // return connectGlobalRedisClient(clientPromise);
  }

  async function get(key: string): Promise<T | undefined> {
    return internalGet(getKey(key));
  }

  async function internalGet(actualKey: string): Promise<T | undefined> {
    client = client ?? await connect();
    const value = await client.get(actualKey);
    return parseValue(value);
  }

  async function set(key: string, value: T): Promise<void> {
    if (isCounter) {
      ok(typeof value === "number", "Expected number value for counter store");
    }
    client = client ?? await connect();
    const json = JSON.stringify(value);
    await client.set(getKey(key), json);
    await postSet();
  }

  async function values(): Promise<T[]> {
    const returning: T[] = [];
    for await (const values of scanValues(DEFAULT_SCAN_SIZE)) {
      returning.push(...values);
    }
    return returning;
  }

  async function* scanValues(count = DEFAULT_SCAN_SIZE): AsyncIterable<T[]> {
    for await (const keys of scan(count)) {
      const values = await Promise.all(
          keys.map(get)
      );
      const filtered = values.filter(Boolean);
      if (filtered.length) {
        yield filtered;
      }
    }
  }

  async function* asyncIterable(): AsyncIterable<T> {
    for await (const values of scanValues()) {
      for (const value of values) {
        yield value;
      }
    }
  }

  async function deleteFn(key: string): Promise<void> {
    client = client ?? await connect();
    await client.del(getKey(key));
  }

  async function has(key: string): Promise<boolean> {
    client = client ?? await connect();
    return !!await client.exists(getKey(key));
  }

  async function keys(): Promise<string[]> {
    const keys: string[] = [];
    for await (const scanned of scan(DEFAULT_SCAN_SIZE)) {
      keys.push(...scanned);
    }
    return keys;
  }

  async function clear(): Promise<void> {
    let deleted = false;
    for await (const keys of scan(DEFAULT_SCAN_SIZE)) {
      await Promise.all(keys.map(deleteFn));
      if (keys.length) {
        deleted = true;
      }
    }
    // If we deleted none, scan would have already called noValuesAvailable
    if (deleted) {
      await noValuesAvailable();
    }
  }

  async function *scan(count = DEFAULT_SCAN_SIZE): AsyncIterable<string[]> {
    client = client ?? await connect();
    const prefix = getPrefix();
    let cursor = "0";
    let found = false;
    do {
      const reply = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", count);
      cursor = reply[0];
      if (reply[1].length) {
        const values = reply[1].map(key => key.substring(prefix.length));
        found = found || !!values.length;
        yield values;
      }
    } while (cursor !== "0");
    if (!found) {
      await noValuesAvailable();
    }
  }

  async function increment(key: string): Promise<number> {
    client = client ?? await connect();
    ok(isCounter, "Expected increment to be used with a counter store only");
    await connect();
    const returnedValue = await client.incr(getKey(key));
    await postSet();
    ok(
        isNumberString(returnedValue),
        "Expected redis to return number when incrementing"
    );
    return +returnedValue;
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

export async function stopRedis() {
  for (const [key, promise] of GLOBAL_CLIENTS_PROMISE.entries()) {
    const client = GLOBAL_CLIENTS.get(key)
    deleteKey(key);
    if (client?.isOpen) {
      await client.disconnect();
    } else {
      // If we didn't yet set the client, but we have a promise active
      // reset all the clients again
      //
      // Its okay if we over do this, we will "just" make a new client
      promise.then(
          (client: RedisClientType) => {
            // If it resolved but it's not set, we made a new promise over the top already
            // so we don't want to reset it
            if (GLOBAL_CLIENTS.get(key) === client) {
              deleteKey(key);
            }
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
      GLOBAL_CLIENT_CONNECTION_PROMISE.delete(client);
    }
  }
}


