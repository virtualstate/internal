import {DurableEventData, DurableRequest, DurableRequestData} from "../data";
import {on} from "../events";
import {isLike, ok} from "../is";
import {FetchRespondWith} from "./dispatch";
import {isMainThread} from "node:worker_threads";
import {isServiceWorker} from "../worker/service-worker/config";

export const FETCH = "fetch" as const;
type ScheduleFetchEventType = typeof FETCH;

export interface FetchEventResponseFn {
    (response: Response, request: Request, durableRequest?: DurableRequest): Promise<void | unknown> | void | unknown
}

export interface FetchEventConfig {
    response?: FetchEventResponseFn | FetchEventResponseFn[];
}

export interface DurableFetchEventCache {
    name: string;
    always?: boolean;
}

export interface DurableFetchEventData extends DurableEventData {
    type: ScheduleFetchEventType;
    request: DurableRequestData;
    dispatch?: DurableEventData;
    cache?: string | DurableFetchEventCache;
}

export interface FetchEvent extends Omit<DurableFetchEventData, "request">, FetchRespondWith {
    request: Request;
    waitUntil(promise: Promise<void | unknown>): void;
    tag?: string;
}

function isFetchEvent(event: unknown): event is FetchEvent {
    return !!(
        isLike<FetchEvent>(event) &&
        event.type === FETCH &&
        event.request &&
        event.respondWith
    )
}

export let removeFetchScheduledFunction = () => {};

if (isMainThread && !isServiceWorker()) {
    removeFetchScheduledFunction = on(FETCH, async (event) => {
        console.log("FETCHING!");
        ok(isFetchEvent(event));
        event.respondWith(
            fetch(
                event.request.clone()
            )
        );
    });
}