import {getOrigin} from "../../listen";
import {BackgroundQuery} from "../../background";
import {DurableEventData, getDurableEventStore} from "../../data";
import {ok} from "../../is";
import {TESTING} from "../../config";

export function isQStash() {
    if (TESTING && !process.env.QSTASH_TESTING) {
        return false;
    }
    return !!process.env.QSTASH_TOKEN;
}

const SCHEDULE_KEY = "schedule";

interface ScheduleMeta {
    messageId: string;
    scheduleId?: string;
    createdAt: string;
}


function getMetaStore(event: DurableEventData) {
    ok(event.durableEventId, "Expected eventId");
    return getDurableEventStore(event).meta<ScheduleMeta>(event.durableEventId);
}

export async function dispatchQStash(event: DurableEventData) {
    const store = getMetaStore(event);

    if (await store.has(SCHEDULE_KEY)) {
        await deleteDispatchQStash(event);
    }

    const { schedule } = event;
    const {
        QSTASH_URL,
        QSTASH_EVENT_URL,
        QSTASH_TOKEN,
        QSTASH_RETRIES,
        QSTASH_CRON_RETRIES,
        QSTASH_DELAY
    } = process.env;
    ok(QSTASH_TOKEN, "Expected QSTASH_TOKEN");
    const targetUrl = new URL(
        QSTASH_EVENT_URL || "/api/event",
        getOrigin()
    );
    const baseUrl = new URL(QSTASH_URL || "https://qstash.upstash.io/v1/publish/");
    if (!baseUrl.pathname.endsWith("/")) {
        baseUrl.pathname = `${baseUrl.pathname}/`;
    }
    ok(baseUrl.pathname.endsWith("/v1/publish/"), "Expected v1 publish qstash API");
    const url = new URL(
        `${baseUrl.pathname}${targetUrl.toString()}`,
        baseUrl.origin
    );
    const headers = new Headers({
        Authorization: `Bearer ${QSTASH_TOKEN}`,
        "Content-Type": "application/json"
    });
    if (schedule?.cron) {
        // https://upstash.com/docs/qstash/features/schedules
        // It can take up to 60 seconds for the schedule to be loaded on an active node and triggered for the first time.
        headers.set("Upstash-Cron", schedule.cron);
        if (QSTASH_CRON_RETRIES) {
            headers.set("Upstash-Retries", QSTASH_CRON_RETRIES);
        }
    }
    if (schedule?.after) {
        // https://upstash.com/docs/qstash/features/delay#absolute-delay
        // The format is a unix timestamp in seconds, based on the UTC timezone.
        const seconds = new Date(schedule.after).getTime() / 1000;
        const rounded = Math.round(seconds);
        headers.set("Upstash-Not-Before", rounded.toString());
    }
    if (!headers.has("Upstash-Retries") && QSTASH_RETRIES) {
        headers.set("Upstash-Retries", QSTASH_RETRIES);
    }
    if (!headers.has("Upstash-Not-Before") && QSTASH_DELAY) {
        // https://upstash.com/docs/qstash/features/delay#relative-delay
        // Upstash-Delay will get overridden by Upstash-Not-Before header when both are used together.
        // Allows for a default delay
        headers.set("Upstash-Delay", QSTASH_DELAY);
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
    const { messageId, scheduleId }: { messageId: string, scheduleId?: string } = await response.json();
    console.log(`Dispatched QStash ${messageId || "No message id"} ${scheduleId || "No Schedule"}`)
    const data = {
        messageId,
        scheduleId,
        createdAt: new Date().toISOString()
    };
    await store.set(SCHEDULE_KEY, data);
    return data;
}

export async function deleteDispatchQStash(event: DurableEventData) {
    const store = getMetaStore(event);
    const schedule = await store.get(SCHEDULE_KEY);
    if (!schedule) {
        return;
    }
    const {
        QSTASH_URL,
        QSTASH_MESSAGES_URL,
        QSTASH_TOKEN
    } = process.env;
    ok(QSTASH_TOKEN, "Expected QSTASH_TOKEN");
    const baseUrl = new URL(QSTASH_MESSAGES_URL || "/v1/messages/", QSTASH_URL || "https://qstash.upstash.io");
    if (!baseUrl.pathname.endsWith("/")) {
        baseUrl.pathname = `${baseUrl.pathname}/`;
    }
    const url = new URL(
        `${baseUrl.pathname}${schedule.messageId}`,
        baseUrl
    );
    const response = await fetch(
        url.toString(),
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${QSTASH_TOKEN}`
            }
        }
    );
    if (response.status !== 404) {
        ok(response.ok, "Could not delete dispatch QStash message");
    }
    await store.delete(SCHEDULE_KEY);
}