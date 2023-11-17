import {useData, useInput} from "../../data";
import {getDurableEvent, listDurableEvents} from "../../../../data";
import {dispatchEvent, DispatchEvent} from "../../../../events";
import {path as createPath} from "./schedule";
import {FastifyRequest} from "fastify";
import {dispatchScheduledDurableEvents} from "../../../../events/schedule/dispatch-scheduled";

export const path = "/durable-events";
export const anonymous = true;
export const cached = true;

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export async function handler() {
    return {
        events: await listDurableEvents({
            type: "dispatch"
        }),
    }
}

interface Body {
    dispatch?: string
}

interface Schema {
    Body: Body
}

export async function submit(request: FastifyRequest<Schema>) {
    if (request.body?.dispatch) {
        const event = await getDurableEvent({
            type: "dispatch",
            durableEventId: request.body.dispatch
        });
        if (event) {
            await dispatchEvent(event);
        }
    }
}

export function ListDurableEvents() {
    const { events } = useInput<{ events: DispatchEvent[] }>();
    const { isUnauthenticated } = useData();
    return (
        <div className="flex flex-col">
            {!isUnauthenticated ? <a href={createPath} className={LINK_CLASS}>Schedule Event</a> : undefined}
            <div className="flex flex-col divide-y">
                {events.map(event => (
                    <div key={event.durableEventId} className="flex flex-row justify-between">
                        <div>{Array.isArray(event.dispatch) ? "Multiple events" : event.dispatch.type}</div>
                        {
                            !isUnauthenticated ? (
                                <form action={path} method="POST">
                                    <input type="hidden" name="dispatch" value={event.durableEventId} />
                                    <button type="submit" className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white">
                                        Dispatch
                                    </button>
                                </form>
                            ) : undefined
                        }
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Component = ListDurableEvents;