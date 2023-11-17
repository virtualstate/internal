import {KeyValueStore} from "./types";
import {KEY_VALUE_STORE_INDEX} from "../../config";

const STORE_NAME = "kv:meta:index";

async function getKeyValueStoreIndexStore() {
    // Importing as we have a circular dependency if not
    const { getKeyValueStore } = await import("./kv");
    return getKeyValueStore<unknown>(STORE_NAME)
}

const ADDED_CACHE = new WeakMap<
    KeyValueStore<unknown>,
    Set<string>
>();

function isKeyValueStoreIndexEnabled() {
    return !!KEY_VALUE_STORE_INDEX;
}

function getStoreCacheSet(store: KeyValueStore<unknown>) {
    const cache = ADDED_CACHE.get(store);
    if (cache) return cache;
    const set = new Set<string>();
    ADDED_CACHE.set(store, set);
    return set;
}

export async function addKeyValueStoreIndex(name: string) {
    if (!isKeyValueStoreIndexEnabled()) {
        return;
    }
    if (name === STORE_NAME) {
        // I mentioned it was circular right?
        return;
    }
    const { isMetaStoreName } = await import("./kv-base");
    if (isMetaStoreName(name)) {
        // Meta stores are retrieved through getKeyValueStore(name).meta(id)
        return;
    }
    const store = await getKeyValueStoreIndexStore();
    const cache = getStoreCacheSet(store);
    if (cache.has(name)) {
        // And again... circular, so we want to make sure we prevent
        // double writes here...
        //
        // If our store reference is not cached in our context we have a problem though...
        return;
    }
    cache.add(name);
    await store.set(name, 1);
}

export async function listKeyValueStoreIndex() {
    if (!isKeyValueStoreIndexEnabled()) {
        return [];
    }
    const store = await getKeyValueStoreIndexStore();
    return store.keys();
}

/**
 * To be called internally when a store is no longer in use or has been detected has having no values
 * @param name
 */
export async function deleteKeyValueStoreIndex(name: string) {
    if (!isKeyValueStoreIndexEnabled()) {
        return;
    }
    const store = await getKeyValueStoreIndexStore();
    await store.delete(name);
}