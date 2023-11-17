export type MetaRecord = Record<string, unknown>;

export interface AsyncSetStore<T> {

}

export interface MetaKeyValueStore<M = unknown> extends KeyValueStore<M> {

}

export interface KeyValueStoreOptions {
    prefix?: string;
    counter?: boolean; // To disable set to false
    memory?: boolean;
    meta?<M>(key?: string): MetaKeyValueStore<M>; // Optional
}

export interface KeyValueStore<T> extends AsyncIterable<T> {
    name: string;
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T): Promise<void>;
    values(): Promise<T[]>;
    keys(): Promise<string[]>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    increment(key: string): Promise<number>;
    meta<M = MetaRecord>(key?: string): MetaKeyValueStore<M>;
}

export interface KeyValueStoreFn {
    <T>(name: string): KeyValueStore<T>
}