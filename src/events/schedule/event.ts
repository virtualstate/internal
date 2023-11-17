import {addDurableEvent, deleteDurableEvent, DurableEventData, getDurableEvent} from "../../data";
import {getConfig} from "../../config";
import {dispatchDefaultSchedule, dispatchSchedule, isDurableEventDefaultSchedule} from "./update";
import {dispatchServiceWorkerEvent} from "../../worker/service-worker/execute";

export interface DispatchEventConfig {
    dispatchEvent?(event: DurableEventData): void | unknown | Promise<void | unknown>
}

const {
    DURABLE_EVENTS_IMMEDIATE
} = process.env;

async function hasDurableEvent(event: DurableEventData) {
    const existing = await getDurableEvent(event);
    return !!existing;
}

export async function dispatchEvent(event: DurableEventData) {

    let durable = event;

    if (!event.virtual) {
        if (!event.durableEventId || !(await hasDurableEvent(event))) {
            durable = await addDurableEvent(event);
        }
    }

    const config = getConfig();
    if (config.dispatchEvent) {
        await config.dispatchEvent(durable);
    } else if (durable.virtual) {
        const {dispatchScheduledDurableEvents} = await import("./dispatch-scheduled");
        await dispatchScheduledDurableEvents({
            event
        });
    } else if (durable.schedule) {
        await dispatchSchedule(durable);
    }

    return durable;
}

export async function deleteDispatchEvent(event: DurableEventData) {
    const {deleteDispatchQStash, isQStash} = await import("./qstash.v1");
    if (isQStash()) {
        await deleteDispatchQStash(event);
    }
    await deleteDurableEvent(event);
}