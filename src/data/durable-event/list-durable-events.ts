import {getDurableEventStore} from "./store";
import {DurableEventTypeData} from "./types";
import {listKeyValueStoreIndex} from "../storage/store-index";

export function listDurableEvents(event: DurableEventTypeData) {
    const store = getDurableEventStore(event);
    return store.values();
}