import {getOrigin} from "../../listen";
import {BackgroundQuery} from "../../background";
import {DurableEventData, getDurableEventStore} from "../../data";
import {ok} from "../../is";
import {TESTING} from "../../config";
import * as process from "process";

export function isQStash() {
    if (TESTING && !process.env.QSTASH_TESTING) {
        return false;
    }
    return !!process.env.QSTASH_TOKEN;
}

const SCHEDULE_KEY = "schedule";

interface ScheduleMeta {
    messageId?: string;
    scheduleId?: string;
    createdAt: string;
}


function getMetaStore(event: DurableEventData) {
    ok(event.durableEventId, "Expected eventId");
    return getDurableEventStore(event).meta<ScheduleMeta>(event.durableEventId);
}

function isQStashV1() {
    const { QSTASH_URL } = process.env;
    if (!QSTASH_URL) return false;
    const url = new URL(QSTASH_URL);
    if (!url.pathname.endsWith("/")) {
        url.pathname = `${url.pathname}/`;
    }
    return url.pathname === "/v1/publish/"
}

function getQStashURL() {
    const { QSTASH_URL } = process.env;
    const baseUrl = new URL(QSTASH_URL || "https://qstash.upstash.io/v2");
    if (baseUrl.pathname.endsWith("/")) {
        baseUrl.pathname = baseUrl.pathname.substring(0, baseUrl.pathname.length - 1);
    }
    ok(baseUrl.pathname.endsWith("/v2"), "Expected v2 qstash API");
    return baseUrl;
}

export async function dispatchQStash(event: DurableEventData) {
    if (isQStashV1()) {
        const v1 = await import("./qstash.v1");
        return v1.dispatchQStash(event);
    }

    const baseUrl = getQStashURL();

    const {
        QSTASH_EVENT_URL,
        QSTASH_TOKEN,
        QSTASH_RETRIES,
        QSTASH_CRON_RETRIES,
        QSTASH_DELAY
    } = process.env;

    const store = getMetaStore(event);

    if (await store.has(SCHEDULE_KEY)) {
        await deleteDispatchQStash(event);
    }

    ok(QSTASH_TOKEN, "Expected QSTASH_TOKEN");
    const targetUrl = new URL(
        QSTASH_EVENT_URL || "/api/event",
        getOrigin()
    );
    const url = new URL(baseUrl.origin);
    const headers = new Headers({
        Authorization: `Bearer ${QSTASH_TOKEN}`,
        "Content-Type": "application/json"
    });

    let isSingleMessage = true;

    const { schedule } = event;

    if (schedule?.cron) {
        // https://upstash.com/docs/qstash/features/schedules
        // It can take up to 60 seconds for the schedule to be loaded on an active node and triggered for the first time.
        headers.set("Upstash-Cron", schedule.cron);
        if (QSTASH_CRON_RETRIES) {
            headers.set("Upstash-Retries", QSTASH_CRON_RETRIES);
        }
        isSingleMessage = false;
    } else if (schedule?.after) {
        // https://upstash.com/docs/qstash/features/delay#absolute-delay
        // The format is a unix timestamp in seconds, based on the UTC timezone.
        const seconds = new Date(schedule.after).getTime() / 1000;
        const rounded = Math.round(seconds);
        headers.set("Upstash-Not-Before", rounded.toString());
    }

    if (!headers.has("Upstash-Not-Before") && (schedule?.delay || QSTASH_DELAY)) {
        // https://upstash.com/docs/qstash/features/delay#relative-delay
        // Upstash-Delay will get overridden by Upstash-Not-Before header when both are used together.
        // Allows for a default delay
        const delay = schedule?.delay || QSTASH_DELAY;
        if (typeof delay === "string") {
            headers.set("Upstash-Delay", delay);
        } else {
            headers.set("Upstash-Delay", `${delay}ms`);
        }
    }

    if (!headers.has("Upstash-Retries") && QSTASH_RETRIES) {
        headers.set("Upstash-Retries", QSTASH_RETRIES);
    }

    if (isSingleMessage) {
        url.pathname = `${baseUrl.pathname}/publish/${targetUrl.toString()}`
    } else {
        url.pathname = `${baseUrl.pathname}/schedules/${targetUrl.toString()}`;
    }

    const background: BackgroundQuery = {
        event: event.type,
        eventId: event.durableEventId,
        eventTimeStamp: event.timeStamp
    };
    const response = await fetch(
        url.toString(),
        {
            method: "POST",
            headers,
            body: JSON.stringify(background)
        }
    );
    ok(response.ok, "Could not dispatch QStash message");
    const { messageId, scheduleId }: Partial<ScheduleMeta> = await response.json();
    const data = {
        scheduleId,
        createdAt: new Date().toISOString()
    };
    if (messageId) {
        console.log("Dispatched QStash message", messageId);
    } else {
        console.log("Dispatched QStash schedule", scheduleId);
        await store.set(SCHEDULE_KEY, data);
    }
    return data;
}

export async function deleteDispatchQStash(event: DurableEventData) {
    if (isQStashV1()) {
        const v1 = await import("./qstash.v1");
        return v1.deleteDispatchQStash(event);
    }

    const store = getMetaStore(event);
    const schedule = await store.get(SCHEDULE_KEY);
    if (!schedule?.scheduleId) {
        return;
    }
    await deleteDispatchQStashScheduledKey(schedule.scheduleId);
    await store.delete(SCHEDULE_KEY);
}

async function deleteDispatchQStashScheduledKey(key: string) {
    const baseUrl = getQStashURL();
    const {
        QSTASH_TOKEN
    } = process.env;
    ok(QSTASH_TOKEN, "Expected QSTASH_TOKEN");
    const url = new URL(baseUrl);
    url.pathname = `${baseUrl.pathname}/schedules/${key}`
    const response = await fetch(
        url.toString(),
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${QSTASH_TOKEN}`
            }
        }
    )
    if (response.status !== 404) {
        ok(response.ok, "Could not delete dispatch QStash message");
    }
}

async function listDispatchQStashScheduledKeys() {
    const baseUrl = getQStashURL();
    const {
        QSTASH_TOKEN
    } = process.env;
    const url = new URL(baseUrl);
    url.pathname = `${baseUrl.pathname}/schedules`;
    const response = await fetch(
        url.toString(),
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${QSTASH_TOKEN}`
            }
        }
    );
    ok(response.ok, "Unexpected response from QStash");
    const schedules: { scheduleId: string }[] = await response.json();
    ok(Array.isArray(schedules), "Unexpected response from QStash");
    return schedules.map(
        ({ scheduleId }) => scheduleId
    );
}

export async function clearDispatchQStash() {
    const keys = await listDispatchQStashScheduledKeys();
    if (!keys.length) {
        return;
    }
    const promises = keys.map(deleteDispatchQStashScheduledKey);
    // Doing allSettled + all means we will delete all we can, and then, we will throw
    // an aggregated error of anything that failed together.
    await Promise.allSettled(promises);
    await Promise.all(promises);
}