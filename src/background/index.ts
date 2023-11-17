import {
    BACKGROUND_STATIC,
    getIdentifiedBackground,
    seed,
} from "../data";
import {isLike, isNumberString} from "../is";
import type {BackgroundScheduleOptions} from "../events/schedule/dispatch-scheduled";

export interface BackgroundInput extends Record<string, unknown> {
    quiet?: boolean;
}

export interface BackgroundQuery extends Record<string, unknown> {
    event?: string;
    eventId?: string;
    durableEventId?: string;
    eventTimeStamp?: string | `${number}` | number;
    cron?: string;
    seed?: string;
}

export interface QueryInput extends BackgroundInput {
    query: BackgroundQuery;
}

function isQueryInput(input: BackgroundInput): input is QueryInput {
    return isLike<QueryInput>(input) && !!input.query;
}

export async function background(input: BackgroundInput | QueryInput = {}) {

    if (isQueryInput(input) && input.query.seed) {
        const backgroundId = getBackgroundIdentifier();
        if (!input.quiet) {
            console.log(`Running background tasks for ${backgroundId}`, input);
        }
        const complete = await getIdentifiedBackground(backgroundId);
        try {
            await seed();
        } finally {
            // Complete no matter what, but allow above to throw
            await complete();
        }

        if (!input.quiet) {
            console.log(`Completed background tasks for ${backgroundId}`, input);
        }
    } else {
        // Has its own locking
        await backgroundScheduleWithOptions(input);
    }

    function getBackgroundIdentifier() {
        if (isQueryInput(input)) {
            if (input.query.cron) {
                return `background:cron:${input.query.cron}`;
            }
        }
        return BACKGROUND_STATIC;
    }
}

async function backgroundScheduleWithOptions(input: BackgroundInput) {
    const options: BackgroundScheduleOptions = {};
    if (isQueryInput(input)) {
        const {
            cron,
            event
        } = input.query;
        if (cron) {
            options.cron = cron;
        } else if (event) {
            const {
                eventId,
                durableEventId: givenDurableEventId,
                eventTimeStamp: timeStamp
            } = input.query;
            const durableEventId = givenDurableEventId || eventId;
            if (durableEventId) {
                options.event = {
                    type: event,
                    durableEventId
                }
                if (isNumberString(timeStamp)) {
                    options.event.timeStamp = +timeStamp;
                }
            } else {
                options.event = {
                    type: event
                }
            }
        }
    }
    const { dispatchScheduledDurableEvents } = await import("../events/schedule/dispatch-scheduled");
    return dispatchScheduledDurableEvents(options);
}