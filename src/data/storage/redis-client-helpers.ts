import {KeyValueStoreOptions} from "./types";

export function isRedis() {
  return !!getRedisUrl();
}

export function getRedisUrl() {
  return process.env.REDIS_URL;
}

export function getRedisPrefix(name: string, options?: KeyValueStoreOptions) {
  return `${name}::${options?.prefix ?? ""}`;
}

export function getRedisPrefixedKey(name: string, key: string, options?: KeyValueStoreOptions): string {
  return `${getRedisPrefix(name, options)}${key}`;
}