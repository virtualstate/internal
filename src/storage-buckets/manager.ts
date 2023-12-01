import {StorageBucket, StorageBucketManager, StorageBucketOptions} from "./types";
import {Promise} from "@virtualstate/promise";
import {getInternalStorageBucket, listInternalStorageBucketNames} from "./internal";
import {DurableCacheStorage} from "../fetch";
import {getOrigin} from "../listen";
import {getConfig} from "../config";

export interface DurableStorageBucketConfig {
    getDurableStorageBucketOrigin?(): string
}

function getDurableStorageBucketOrigin() {
    const config = getConfig();
    return (
        config.getDurableStorageBucketOrigin?.() ??
        config.getDurableCacheStorageOrigin?.() ??
        getOrigin()
    );
}

export interface DurableStorageBucketOptions extends StorageBucketOptions {
    name: string;
}

export class DurableStorageBucket implements StorageBucket {
    caches: CacheStorage;
    name: string

    private options: DurableStorageBucketOptions;


    constructor(options: DurableStorageBucketOptions) {
        this.name = options.name;
        this.options = options;
        const internalBucket = getInternalStorageBucket(options.name);

        this.caches = new DurableCacheStorage({
            url: getDurableStorageBucketOrigin,
            internalBucket
        });
    }

    async estimate(): Promise<StorageEstimate> {
        return undefined
    }

    async expires(): Promise<number | undefined> {
        return undefined;
    }

    async getDirectory(): Promise<FileSystemDirectoryHandle> {
        return undefined;
    }

    async persist(): Promise<boolean> {
        return false;
    }

    async persisted(): Promise<boolean> {
        return this.options.persisted;
    }

    async setExpires(expires: number): Promise<void> {
        if (expires < Date.now()) {
            await deleteStorageBucket(this);
        }
    }

}

async function deleteStorageBucket(bucket: StorageBucket) {
    for (const cacheName of await bucket.caches.keys()) {
        await bucket.caches.delete(cacheName);
    }
    await getInternalStorageBucket(bucket.name).delete();
}

export class DurableStorageBucketManager implements StorageBucketManager {

    private buckets = new Map<string, StorageBucket>();

    async delete(name: string) {
        await deleteStorageBucket(await this.open(name));
        this.buckets.delete(name);
    }

    async keys(): Promise<string[]> {
        return [...new Set([
            ...this.buckets.keys(),
            ...await listInternalStorageBucketNames()
        ])];
    }

    async open(name: string, options?: StorageBucketOptions): Promise<StorageBucket> {
        const open = this.buckets.get(name);
        if (open) {
            return open;
        }
        const bucket = new DurableStorageBucket({
            ...options,
            name
        });
        this.buckets.set(name, bucket);
        return bucket;
    }

}

export const storageBuckets = new DurableStorageBucketManager();