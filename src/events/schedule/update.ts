import {virtual} from "../virtual/virtual";
import {DURABLE_EVENTS_INDEX_SCHEDULE, getConfig, KEY_VALUE_STORE_INDEX, DURABLE_EVENTS_IMMEDIATE} from "../../config";
import {DurableEventData, DurableEventSchedule, getDurableEventStore, listDurableEventTypes} from "../../data";
import {clearDispatchQStash, isQStash} from "./qstash";
import {clearDispatchInternalSchedule} from "./internal";

export interface EventScheduleConfig {
    dispatchSchedules?(): Promise<void>
    dispatchSchedule?(event: DurableEventData): Promise<void>
    deleteDispatchSchedule?(event: DurableEventData): Promise<void>
    clearDispatchSchedule?(): Promise<void>
}

export function isDurableEventDefaultSchedule() {
    return !!DURABLE_EVENTS_IMMEDIATE
}

export async function dispatchDefaultSchedule(event: DurableEventData) {
    const {dispatchScheduledDurableEvents} = await import("./dispatch-scheduled");
    const {dispatchInternalSchedule, isInternalSchedule} = await import("./internal");
    const {dispatchQStash, isQStash} = await import("./qstash");
    if (event.schedule?.immediate) {
        await dispatchScheduledDurableEvents({
            event
        });
    } else if (isInternalSchedule()) {
        await dispatchInternalSchedule(event);
    } else if (isQStash()) {
        await dispatchQStash(event);
    } else if (event.schedule) {
        await dispatchInternalSchedule(event);
    } else {
        await dispatchScheduledDurableEvents({
            event
        });
    }
}

export async function dispatchSchedule(event: DurableEventData) {
    const config = getConfig();
    const fn = config.dispatchSchedule ?? dispatchDefaultSchedule;
    return fn(event);
}

function isDurableEventIndexScheduleEnabled() {
    return DURABLE_EVENTS_INDEX_SCHEDULE && KEY_VALUE_STORE_INDEX
}

/**
 * Note that this is only usable if KEY_VALUE_STORE_INDEX is enabled
 */
async function dispatchDefaultIndexSchedules() {
    for (const type of await listDurableEventTypes()) {
        for await (const event of getDurableEventStore({
            type
        })) {
            if (!event.schedule) continue;
            await dispatchSchedule(event);
        }
    }
}

async function dispatchDefaultSchedules() {
    if (isDurableEventIndexScheduleEnabled()) {
        await dispatchDefaultIndexSchedules();
    }
}

export async function dispatchSchedules() {
    const config = getConfig();
    const fn = config.dispatchSchedules ?? dispatchDefaultSchedules;
    return fn();
}

export const removeScheduleVirtualFunction = virtual(dispatchSchedules);

export function isScheduleRepeating(schedule: DurableEventSchedule) {
    return !!schedule.cron || schedule.repeat;
}

export async function deleteDispatchSchedule(event: DurableEventData) {
    const config = getConfig();
    const fn = config.deleteDispatchSchedule ?? deleteDefaultDispatchSchedule;
    return fn(event);
}

export async function clearDispatchSchedule() {
    const config = getConfig();
    const fn = config.clearDispatchSchedule ?? clearDefaultDispatchSchedule;
    return fn();
}


async function deleteDefaultDispatchSchedule(event: DurableEventData) {
    const {deleteDispatchInternalSchedule} = await import("./internal");
    const {deleteDispatchQStash, isQStash} = await import("./qstash");
    if (isQStash()) {
        await deleteDispatchQStash(event);
    } else {
        await deleteDispatchInternalSchedule(event);
    }
}

async function clearDefaultDispatchSchedule() {
    const {clearDispatchInternalSchedule} = await import("./internal");
    const {clearDispatchQStash, isQStash} = await import("./qstash");
    if (isQStash()) {
        await clearDispatchQStash();
    } else {
        await clearDispatchInternalSchedule();
    }
}