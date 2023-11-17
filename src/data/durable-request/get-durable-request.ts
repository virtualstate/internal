import {getDurableRequestStore} from "./store";
import {DurableEventData} from "../durable-event";
import {ok} from "../../is";

export function getDurableRequest(durableRequestId: string) {
    const store = getDurableRequestStore();
    return store.get(durableRequestId);
}

export function getDurableRequestIdForEvent(event: DurableEventData) {
    ok(event.durableEventId, "Expected durableEventId");
    return `${event.type}:request:${event.durableEventId}`;
}

export function getDurableRequestForEvent(event: DurableEventData) {
    return getDurableRequest(
        getDurableRequestIdForEvent(event)
    );
}