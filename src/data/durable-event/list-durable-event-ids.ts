import {DurableEventTypeData} from "./types";
import {getDurableEventStore} from "./store";

export function listDurableEventIds(event: DurableEventTypeData) {
    const store = getDurableEventStore(event);
    return store.keys();
}