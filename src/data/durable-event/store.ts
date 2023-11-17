import {getHappeningStore} from "../happening";
import {DurableEvent, DurableEventTypeData} from "./types";
import {listKeyValueStoreIndex} from "../storage/store-index";
import {isMetaStoreName} from "../storage/kv-base";

const STORE_PREFIX = "event:";


export function getDurableEventStore({ type }: DurableEventTypeData) {
    return getHappeningStore<DurableEvent>(`${STORE_PREFIX}${type}`, {
        counter: false
    });
}

/**
 * Note that this is only usable if KEY_VALUE_STORE_INDEX is enabled
 */
export async function listDurableEventTypes() {
    const stores = await listKeyValueStoreIndex();
    return stores
        .filter(name => name.startsWith(STORE_PREFIX))
        .map(name => name.substring(STORE_PREFIX.length));
}