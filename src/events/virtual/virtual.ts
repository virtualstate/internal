import {DurableEventData} from "../../data";
import {getConfig} from "../../config";
import {union} from "@virtualstate/union";
import {isAsyncIterable, isIterable, isPromise, ok} from "../../is";
import {v4} from "uuid";

type EventLike = DurableEventData | Iterable<DurableEventData>;
type AsyncEventLike = EventLike | Promise<EventLike> | AsyncIterable<EventLike>;

export interface VirtualEventFn {
    (): AsyncEventLike | void | Promise<void>
}

export type VirtualEventSource = VirtualEventFn | VirtualEventFn[] | Record<string, VirtualEventFn>;

export interface VirtualEventConfig {
    events?: VirtualEventSource;
}

export const VIRTUAL_FUNCTIONS = new Set<VirtualEventFn>();

export function virtual(fn: VirtualEventFn) {
    return createVirtualFunction(fn);
}

export function createVirtualFunction(fn: VirtualEventFn) {
    VIRTUAL_FUNCTIONS.add(fn);
    return () => {
        VIRTUAL_FUNCTIONS.delete(fn);
    };
}

export async function *generateVirtualEvents() {

    // Ensure all virtual functions are loaded
    await import("../../virtual");

    const { events } = getConfig();

    const fnsSnapshot = [...VIRTUAL_FUNCTIONS];
    let sources: (VirtualEventSource | VirtualEventSource[]) = fnsSnapshot;

    if (events) {
        sources = [
            events,
            fnsSnapshot
        ];
    }

    const seen = new WeakSet<DurableEventData>();

    for await (const events of generate(sources)) {
        const yieldingEvents = events.filter(event => !seen.has(event));
        if (!yieldingEvents.length) continue;
        for (const event of yieldingEvents) {
            if (!event.durableEventId) {
                // Provide it or have it mutated...
                event.durableEventId = v4();
            }
            if (!event.virtual) {
                // Provide it or have it mutated...
                event.virtual = true;
            }
        }
        yield yieldingEvents;
        for (const event of yieldingEvents) {
            seen.add(event);
        }
    }

    function generate(events: VirtualEventSource | VirtualEventSource[]) {
        if (isVirtualEventFn(events)) {
            return functionSource(events);
        }

        if (Array.isArray(events)) {
            return arraySource(events);
        }

        return arraySource(Object.values(events));
    }


    function isVirtualEventFn(value: unknown): value is VirtualEventFn {
        return typeof value === "function";
    }

    async function *asyncIterableSource(source: AsyncIterable<EventLike>): AsyncIterable<DurableEventData[]> {
        for await (const values of source) {
            if (isDurableEventDataIterable(values)) {
                yield [...values];
            } else {
                yield [values];
            }
        }
    }

    async function *functionSource(fn: VirtualEventFn): AsyncIterable<DurableEventData[]> {
        let result = fn();
        if (isPromise(result)) {
            result = await result;
        }
        if (!result) {
            return;
        }
        if (isDurableEventDataArray(result)) {
            return yield result;
        }
        if (isDurableEventDataIterable(result)) {
            return yield [...result];
        }
        if (isAsyncIterable(result)) {
            return yield * asyncIterableSource(result);
        }
        ok(!Array.isArray(result));
        yield [result];
    }

    function isDurableEventDataArray(value: unknown): value is DurableEventData[] {
        return Array.isArray(value);
    }

    function isDurableEventDataIterable(value: unknown): value is Iterable<DurableEventData> {
        return isIterable(value);
    }

    async function *arraySource(events: VirtualEventSource[]): AsyncIterable<DurableEventData[]> {
        for await (const allEvents of union([...new Set(events)].map(generate))) {
            const yieldingEvents = allEvents
                .filter(Boolean)
                .flatMap<DurableEventData>(events => events.filter(event => !seen.has(event)))
            if (yieldingEvents.length) {
                yield yieldingEvents;
            }
        }
    }
}