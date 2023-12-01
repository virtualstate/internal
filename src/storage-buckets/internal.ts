import {getKeyValueStore, KeyValueStore, KeyValueStoreOptions} from "../data";
import {listKeyValueStoreIndex} from "../data/storage/store-index";

export interface InternalBucket {
    getKeyValueStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T>
    delete(): Promise<void>
}

export function getInternalStorageBucket(bucket: string = "default"): InternalBucket {
    const isDefault = bucket === "default";
    const prefix = isDefault ? "" : `bucket:${bucket}:`
    return {
        getKeyValueStore<T>(name: string, options?: KeyValueStoreOptions): KeyValueStore<T> {
            if (isDefault) {
                return getKeyValueStore(name, options);
            } else {
                return getKeyValueStore(`${prefix}${name}`, options);
            }
        },
        async delete() {
            const names = await getStoresToDelete();

            for (const name of names) {
                const store = getKeyValueStore(name);
                await store.clear();
            }

            async function getStoresToDelete() {
                const keys = await listKeyValueStoreIndex();
                if (isDefault) {
                    return keys.filter(key => !key.startsWith("bucket:"))
                } else {
                    return keys.filter(key => key.startsWith(prefix))
                }
            }
        }
    }
}