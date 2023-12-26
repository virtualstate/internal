import {on, dispatchEvent} from "../schedule";
import type {DurableEventData, UnknownEvent} from "../../data";
import {isLike, ok} from "../../is";
import {getServiceWorkerModuleExports} from "../../worker/service-worker/worker-exports";
import {getDispatcherFunction} from "../schedule/schedule";

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
    let dispatching: DurableEventData;

    if (typeof event.dispatch === "string") {
        dispatching = {
            type: event.dispatch
        };
    } else {
        dispatching = {
            ...event.dispatch
        };
    }

    if (dispatching.type === "dispatch") {
        // This is to prevent infinite loops
        console.warn("dispatch cannot be used to dispatch additional events");
        return;
    }

    const entrypointArguments = event.entrypointArguments;
    async function dispatchEntrypointEvent(entrypoint: unknown) {
        const dispatcher = getDispatcherFunction({
            event: dispatching
        });
        if (dispatcher) {
            return dispatcher.handler(dispatching, dispatch);
        } else {
            return dispatch(dispatching);
        }

        function dispatch(dispatching: DurableEventData) {
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
    }

    async function dispatch() {
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

    if (event.entrypoint) {
        const entrypoints = getServiceWorkerModuleExports();
        const entrypoint = entrypoints[event.entrypoint]
        if (typeof entrypoint === "function") {
            await dispatchEntrypointEvent(entrypoint)
        } else if (isLike<Record<string, unknown>>(entrypoint) && typeof entrypoint[dispatching.type] === "function") {
            await dispatchEntrypointEvent(entrypoint[dispatching.type])
        } else if (isLike<{ default: Record<string, unknown> }>(entrypoints) && entrypoints.default) {
            const entrypoint = entrypoints.default[event.entrypoint];
            if (typeof entrypoint === "function") {
                await dispatchEntrypointEvent(entrypoint)
            } else if (isLike<Record<string, unknown>>(entrypoint) && typeof entrypoint[dispatching.type] === "function") {
                await dispatchEntrypointEvent(entrypoint[dispatching.type])
            } else {
                await dispatch();
            }
        } else {
            // If entrypoint isn't available, dispatch as normal event
            await dispatch();
        }
    } else {
        await dispatch();
    }
}

export const removeDispatchScheduledFunction = on(DISPATCH, onDispatchEvent);