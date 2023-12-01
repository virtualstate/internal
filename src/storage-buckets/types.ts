export interface StorageBucketOptions {
    persisted?: boolean;
    quota?: number;
    expires?: number;
}

export interface StorageBucketManager {
    open(name: string, options?: StorageBucketOptions): Promise<StorageBucket>
    keys(): Promise<string[]>;
    delete(name: string): Promise<void>;
}

export interface StorageBucket {
    name: string;

    persist(): Promise<boolean>;
    persisted(): Promise<boolean>;
    estimate(): Promise<StorageEstimate>;
    setExpires(expires: number): Promise<void>;
    expires(): Promise<number | undefined>;
    indexedDb?: unknown;
    caches: CacheStorage;

    getDirectory(): Promise<FileSystemDirectoryHandle>;
}