import {
  getGlobalRedisClient,
  RedisClient
} from "./redis-client";
import {isRedisMemory} from "./redis-memory";
import {getRedisUrl, isRedis} from "./redis-client-helpers";
import {isFalseString, isTrueString} from "../../is";

const DEFAULT_TIMEOUT = 2500;
const DEFAULT_RETRY_DELAY = 25;

const GLOBAL_LOCKS = new Map<string, LockFn>();

export function isLocking() {
  return !!getGlobalLock();
}

export function isConfigurableNameLocking(name: string) {
  const key = `LOCK_${name.toUpperCase().replace(/[^a-z]+/g, "_")}`;
  return isTrueString(process.env[key]);
}

export async function configurableLock(name: string): Promise<UnlockFn> {
  if (!isConfigurableNameLocking(name)) {
    return createFakeLock();
  }
  return lock(name);
}

export async function lock(name: string): Promise<UnlockFn> {
  const fn = getGlobalLock();

  if (!fn) {
    // noop for now
    return createFakeLock();
  }

  return fn(name);
}

export function createFakeLock(): UnlockFn {
  return async () => {
    return void 0; // noop
  };
}

export function getGlobalLock(): LockFn | undefined {
  if (!isRedis()) return undefined;
  const url = getRedisUrl();
  const existing = GLOBAL_LOCKS.get(url);
  if (existing) return existing;
  const fn =  async (name: string) => {
    const client = await getGlobalRedisClient();
    return acquire(client, name);
  };
  GLOBAL_LOCKS.set(url, fn);
  return
}



export interface UnlockFn {
  (): Promise<void>;
}

export interface LockFn {
  (name: string): Promise<UnlockFn>
}

async function acquire(client: RedisClient, name: string): Promise<UnlockFn> {
  const timeout = DEFAULT_TIMEOUT;
  const timeoutAfter = Date.now() + timeout + 1;
  const key = `lock::${name}`;
  return await tryAcquire();

  async function unlock() {
    await client.del(key);
  }

  async function tryAcquire(): Promise<UnlockFn> {
    try {
      const result = await client.set(key, timeoutAfter, "PX", timeout, "NX");
      if (result) {
        return unlock;
      }
    } catch { }
    await new Promise<void>(resolve => setTimeout(resolve, DEFAULT_RETRY_DELAY));
    return tryAcquire();
  }
}