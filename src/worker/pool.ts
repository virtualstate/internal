import {
    AbstractPool,
    availableParallelism,
    DynamicThreadPool,
    FixedThreadPool,
    IWorker,
    ThreadPoolOptions
} from "poolifier";
import {getConfig} from "../config";
import {isLike, ok} from "../is";
import {getOrigin} from "../listen";
import {dirname, join} from "node:path";
import {getWorkerURLForImportURL} from "./worker";

interface GetWorkerPoolFn {
    <T>(availableParallelism: number, url: string, options: ThreadPoolOptions): AbstractPool<IWorker, T>;
}

export interface WorkerPoolConfig {
    getWorkerPool?: GetWorkerPoolFn;
}

const getDefaultPool: GetWorkerPoolFn = function getDefaultPool<T>(availableParallelism: number, url: string, options: ThreadPoolOptions): AbstractPool<IWorker, T> {
    return new FixedThreadPool<T>(1, url, options);
};

const pools = new WeakMap<GetWorkerPoolFn, Record<string, AbstractPool<IWorker>>>();

export function getWorkerPoolForImportURL<T>(relative: string, url: string | URL, options?: ThreadPoolOptions) {
    return getWorkerPool(getWorkerURLForImportURL(relative, url), options);
}

/**
 * @param url
 * @param options used when new pool created for url, not used if exists
 */
export function getWorkerPool<T>(url: string | URL, options?: ThreadPoolOptions): AbstractPool<IWorker, T> {
    const instance = new URL(url);
    const { protocol } = instance;
    ok(protocol === "file:", "Only file import worker supported... for now, please open an issue");
    const config = getConfig();
    const fn = config.getWorkerPool ?? getDefaultPool;
    const cache = pools.get(fn) ?? {};
    const urlString = instance.toString();
    const existing = cache?.[urlString];
    if (isLike<AbstractPool<IWorker, T>>(existing)) {
        return existing
    }
    const pool = fn<T>(availableParallelism(), instance.pathname, {
        ...options
    });
    cache[urlString] = pool;
    pools.set(fn, cache);
    return pool;
}