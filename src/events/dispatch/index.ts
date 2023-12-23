import {on, dispatchEvent} from "../schedule";
import type {DurableEventData, UnknownEvent} from "../../data";
import {isLike, ok} from "../../is";
import {getServiceWorkerModuleExports} from "../../worker/service-worker/worker-exports";

const DISPATCH = "dispatch" as const;
type DispatchEventType = typeof DISPATCH;

export interface DispatchEvent extends DurableEventData {
    type: DispatchEventType;
    dispatch: DurableEventData | DurableEventData[];
    entrypoint?: string;
    entrypointArguments?: string[];
}

export function isDispatchEvent(event?: UnknownEvent): event is DispatchEvent {
    return !!(
        isLike<Partial<DispatchEvent>>(event) &&
        event.type === "dispatch" &&
        event.dispatch
    );
}

export async function onDispatchEvent(event: UnknownEvent) {
    if (!isDispatchEvent(event)) return;
    if (Array.isArray(event.dispatch)) {
        // Allows parallel dispatch with one main event
        // If serial dispatches are wanted this can be done with just multiple
        // immediate dispatches using `dispatchEvent` directly
        //
        // Parallel dispatch is useful in a service worker with many fetch events
        // at once, say for `.addAll(urls)`
        await Promise.all(event.dispatch.map(dispatch => ({
            ...event,
            dispatch
        })));
        return;
    }
    if (event.dispatch.type === "dispatch") {
        // This is to prevent infinite loops
        console.warn("dispatch cannot be used to dispatch additional events");
        return;
    }
    let dispatching: DurableEventData = {
        ...event.dispatch
    };

    const entrypointArguments = event.entrypointArguments;
    async function dispatchEntrypointEvent(entrypoint: unknown) {
        ok(typeof entrypoint === "function", "Expected entrypoint to be a function");
        if (entrypointArguments) {
            const dispatchArguments = entrypointArguments.map(
                key => key === "$event" ? dispatching : dispatching[key]
            );
            return entrypoint(...dispatchArguments);
        } else {
            ok<typeof dispatchEvent>(entrypoint);
            return entrypoint(dispatching);
        }
    }

    if (event.entrypoint) {
        const entrypoints = getServiceWorkerModuleExports();
        if (typeof entrypoints[event.entrypoint] === "function") {
            await dispatchEntrypointEvent(entrypoints[event.entrypoint])
        } else if (isLike<{ default: Record<string, unknown> }>(entrypoints) && entrypoints.default && typeof entrypoints.default[event.entrypoint] === "function") {
            await dispatchEntrypointEvent(entrypoints.default[event.entrypoint])
        } else {
            throw new Error(`Unknown entrypoint ${event.entrypoint}`);
        }
    } else {

        if (!dispatching.durableEventId) {
            dispatching.virtual = true;
        }
        if (!dispatching.virtual && !dispatching.schedule) {
            dispatching.schedule = {
                immediate: true
            };
        }

        await dispatchEvent(dispatching);
    }
}

export const removeDispatchScheduledFunction = on(DISPATCH, onDispatchEvent);