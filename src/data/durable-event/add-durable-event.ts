import {v4} from "uuid";
import {DurableEvent, DurableEventData} from "./types";
import {getDurableEventStore} from "./store";
import {ok} from "../../is";

export async function addDurableEvent(event: DurableEventData) {
    return setDurableEvent(event);
}

export async function setDurableEvent(event: DurableEventData) {
    const createdAt = event.createdAt || new Date().toISOString();
    const eventId = event.durableEventId || v4();
    const durable: DurableEvent = {
        timeStamp: Date.now(),
        createdAt,
        updatedAt: createdAt,
        durableEventId: eventId,
        ...event
    };
    ok(!durable.virtual, "Cannot store virtual event");
    const store = getDurableEventStore(durable);
    await store.set(eventId, durable);
    return durable;
}