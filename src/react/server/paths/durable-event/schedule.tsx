import { FastifyRequest } from "fastify";
import {
    useError,
    useMaybeBody,
    useMaybeResult,
    useProduct,
    useQuery,
    useService,
    useSubmitted,
    useTimezone
} from "../../data";
import {
    DurableEvent,
    DurableEventData, DurableEventSchedule, UnknownEvent
} from "../../../../data";
import {ok} from "../../../../is";
import {DispatchEvent, dispatchEvent, isDispatchEvent} from "../../../../events";
import {DateTime} from "luxon";
import {DEFAULT_TIMEZONE} from "../../../../config";

export const path = "/durable-event/schedule";

export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

const FORM_CLASS = `
mt-1
block
w-full
md:max-w-sm
rounded-md
border-gray-300
shadow-sm
focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
disabled:bg-slate-300 disabled:cursor-not-allowed
`.trim();
const FORM_GROUP_CLASS = `block py-2`;

interface DispatchEventScheduleBody extends DispatchEvent {
    data?: string;
}

function assertDispatchEvent(value: unknown): asserts value is DispatchEventScheduleBody {
    ok<UnknownEvent>(value);
    ok(isDispatchEvent(value));
}

export async function submit(request: FastifyRequest) {
    const data = request.body;
    assertDispatchEvent(data);
    ok(!Array.isArray(data.dispatch));
    let dispatching: DurableEventData = {
        ...data.dispatch
    }
    if (data.data) {
        const parsed = JSON.parse(data.data);
        dispatching = {
            ...parsed,
            ...dispatching
        }
    }
    let schedule: DurableEventSchedule;
    if (data.schedule.immediate) {
        schedule = {
            immediate: true
        }
    } else {
        schedule = {};
        if (data.schedule.after) {
            schedule.timezone = data.schedule.timezone;
            schedule.after = fromWebDate(data.schedule.after, schedule.timezone);
        }
        if (data.schedule.before) {
            schedule.timezone = data.schedule.timezone;
            schedule.before = fromWebDate(data.schedule.before, schedule.timezone);
        }
        if (data.schedule.cron) {
            schedule.cron = data.schedule.cron;
        }
    }
    const event = await dispatchEvent({
        type: "dispatch",
        dispatch: dispatching,
        schedule,
        retain: !!data.retain
    });
    console.log({ event });
    return { success: true, event };
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function ScheduleDurableEvent() {
    const body = useMaybeBody<DispatchEventScheduleBody>();

    const result = useMaybeResult<{ success: boolean; event: DispatchEvent }>();
    const error = useError();
    const timezone = useTimezone();

    console.error(error);

    return <DurableEventBody body={result?.success ? undefined : body} />

    function DurableEventBody({ body }: { body?: DispatchEventScheduleBody }) {
        return (
            <form name="durable-event" action={`${path}#action-section`} method="post">
                <input type="hidden" name="type" value="dispatch" />
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Event Type</span>
                        <input
                            className={FORM_CLASS}
                            type="text"
                            name="dispatch.type"
                            placeholder="Event Type"
                            defaultValue={body?.type || ""}
                        />
                    </label>
                </div>
                <style dangerouslySetInnerHTML={{__html: `
                        
                form[name="durable-event"]:has(input[name="schedule.immediate"]:checked) .scheduled,
                form[name="durable-event"]:has(input[name="schedule.immediate"]:checked) .scheduled-flex {
                    display: none;
                }
                form[name="durable-event"]:has(input[name="schedule.immediate"]:not(:checked)) .scheduled {
                    display: block;
                }
                form[name="durable-event"]:has(input[name="schedule.immediate"]:not(:checked)) .scheduled-flex {
                    display: flex;
                }
                
                `.trim()}} />
                <label htmlFor="schedule.immediate" className="my-4 flex flex-row align-start">
                    <input
                        name="schedule.immediate"
                        id="schedule.immediate"
                        type="checkbox"
                        className="form-checkbox rounded m-1"
                        defaultChecked={body?.schedule?.immediate ?? true}
                    />
                    <span className="flex flex-col ml-4">
                        Dispatch Immediately
                    </span>
                </label>
                <label className={`${FORM_GROUP_CLASS} scheduled`}>
                    <span className="text-gray-700">Timezone</span>
                    <select name="schedule.timezone" className={FORM_CLASS} defaultValue={body?.schedule?.timezone || timezone}>
                        <option value="Pacific/Auckland">Pacific/Auckland</option>
                    </select>
                </label>
                <label className={`${FORM_GROUP_CLASS} scheduled`}>
                    <span className="text-gray-700">Dispatch After</span>
                    <input
                        className={FORM_CLASS}
                        type="datetime-local"
                        name="schedule.after"
                        placeholder="Dispatch After"
                        defaultValue={body?.schedule?.after || ""}
                    />
                </label>
                <label className={`${FORM_GROUP_CLASS} scheduled`}>
                    <span className="text-gray-700">Dispatch Before</span>
                    <input
                        className={FORM_CLASS}
                        type="datetime-local"
                        name="schedule.before"
                        placeholder="Dispatch Before"
                        defaultValue={body?.schedule?.before || ""}
                    />
                </label>
                <label htmlFor="retain" className="scheduled-flex my-4 flex-row align-start">
                    <input
                        name="retain"
                        id="retain"
                        type="checkbox"
                        className="form-checkbox rounded m-1"
                        defaultChecked={body?.retain ?? false}
                    />
                    <span className="flex flex-col ml-4">
                        Retain Event After Dispatch
                    </span>
                </label>
                <label className={`${FORM_GROUP_CLASS} scheduled`}>
                    <span className="text-gray-700">Repeat Event on Cron Schedule (<a href="https://crontab.guru/" target="_blank" className={LINK_CLASS}>crontab.guru</a>)</span>
                    <input
                        className={FORM_CLASS}
                        type="text"
                        name="schedule.cron"
                        placeholder="Cron pattern (0 * * * *)"
                        defaultValue={body?.type || ""}
                    />
                    <br />

                </label>
                <div className="flex flex-col">
                    <label className={FORM_GROUP_CLASS}>
                        <span className="text-gray-700">Include JSON data in event?</span>
                        <textarea name="data" className={FORM_CLASS} defaultValue={body?.data ?? ""} />
                    </label>
                </div>
                <div id="action-section">
                    <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Schedule Event
                    </button>
                </div>
            </form>
        )
    }
}

export const Component = ScheduleDurableEvent;


export function fromWebDate(value?: string, timezone?: string) {
    if (!value) return undefined;
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: timezone || DEFAULT_TIMEZONE }).toJSDate();
    } else {
        date = DateTime.fromJSDate(new Date(value), { zone: timezone || DEFAULT_TIMEZONE }).toJSDate();
    }
    // Use a consistent format
    return date.toISOString()
}