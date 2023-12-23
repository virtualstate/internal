import {defer} from "@virtualstate/promise";
import {isLike, isPromise, isSignalled, ok, Signalled} from "../is";
import {
    DurableBody,
    DurableEventData,
    DurableRequest,
    fromDurableRequest,
    fromRequestResponse,
    setDurableRequestForEvent
} from "../data";
import {dispatcher} from "../events/schedule/schedule";
import {v4} from "uuid";
import {caches} from "./cache";
import {dispatchEvent} from "../events/schedule/event";
import {getConfig} from "../config";
import type {DurableFetchEventCache, DurableFetchEventData} from "./events";
import {getServiceWorkerModuleExports} from "../worker/service-worker/worker-exports";

export function isDurableFetchEventCache(value: unknown): value is DurableFetchEventCache {
    return !!(
        isLike<DurableFetchEventCache>(value) &&
        typeof value.name === "string"
    );
}

export interface GenericRespondWith<R> {
    handled: Promise<void>
    respondWith(value: R | Promise<R>): void
}

export interface WaitUntil {
    waitUntil(promise: Promise<void | unknown>): void
}

export interface ExtendableEvent extends WaitUntil, DurableEventData {

}

interface InternalWaitUntil extends WaitUntil {
    wait(): Promise<void>;
}

export interface FetchRespondWith extends GenericRespondWith<Response> {

}

interface InternalFetchRespondWith extends FetchRespondWith {
    promise: Promise<Response>
}

interface InternalSignalled extends Signalled {
    controller: AbortController;
}

function isRespondWith<R>(event: unknown): event is GenericRespondWith<R> {
    return (
        isLike<GenericRespondWith<R>>(event) &&
        typeof event.respondWith === "function" &&
        !!event.handled
    );
}

function isWaitUntil(event: unknown): event is WaitUntil {
    return (
        isLike<WaitUntil>(event) &&
        typeof event.waitUntil === "function"
    )
}

export function createRespondWith(event?: unknown): FetchRespondWith & Partial<InternalFetchRespondWith> {
    if (isRespondWith<Response>(event)) {
        return event;
    }

    const { promise, resolve, reject } = defer<Response>();

    function respondWith(response: Response | Promise<Response>) {
        if (isPromise(response)) {
            return response.then(resolve, reject);
        }
        return resolve(response);
    }

    return {
        promise,
        handled: promise.then<void>(() => undefined),
        respondWith
    }
}

export function createWaitUntil(event?: unknown): WaitUntil & Partial<InternalWaitUntil> {
    if (isWaitUntil(event)) {
        return event;
    }

    let promises: Promise<unknown>[] = [];

    function waitUntil(promise: Promise<unknown>) {
        promises.push(
            promise.catch(error => void error)
        );
    }

    async function wait(): Promise<void> {
        if (!promises.length) {
            return;
        }
        const current = promises;
        promises = [];
        await Promise.all(current);
        return wait();
    }

    return {
        wait,
        waitUntil
    }
}

function createSignal(event?: unknown): Signalled & Partial<InternalSignalled> {
    if (isSignalled(event)) {
        return event;
    }
    const controller = new AbortController();
    return {
        signal: controller.signal,
        controller
    } as const;
}


export function isDurableFetchEventData(event?: DurableEventData): event is DurableFetchEventData {
    return !!(
        isLike<DurableFetchEventData>(event) &&
        event.type === "fetch" &&
        event.request &&
        event.request.url
    );
}

async function onFetchResponse(event: DurableFetchEventData, request: Request, response: Response) {
    let durableEventDispatch: DurableEventData;
    if (event.dispatch) {
        let durableEventDispatchData: DurableEventData;
        if (typeof event.dispatch === "string") {
            durableEventDispatchData = {
                type: event.dispatch
            };
        } else {
            durableEventDispatchData = event.dispatch;
        }
        durableEventDispatch = {
            durableEventId: v4(),
            ...durableEventDispatchData
        };
    }
    const isRetain = durableEventDispatch || (event.durableEventId && event.retain !== false);
    let body: DurableBody;
    const givenCache = typeof event.cache === "string" ? { name: event.cache } : isDurableFetchEventCache(event.cache) ? event.cache : undefined;
    const cache =  givenCache ?? (isRetain ? { name: "fetch" } : undefined);
    // cache name has some special cases:
    // type RequestCache = "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
    if (cache && cache.name !== "no-store" && cache.name !== "only-if-cached") {
        const { name, always } = cache;
        const isForceCache = name === "force-cache"
        if (response.ok || (always || isForceCache)) {
            let cacheName = name;
            if (isForceCache || name === "reload") {
                cacheName = "default";
            }
            const store = await caches.open(cacheName);
            await store.put(request, response);
            body = {
                type: "cache",
                value: name,
                url: request.url
            };
        }
    }
    let durableRequest: DurableRequest;
    if (isRetain) {
        const durableRequestData = await fromRequestResponse(request, response, {
            body
        });
        durableRequest = await setDurableRequestForEvent(durableRequestData, durableEventDispatch || event);
        if (durableEventDispatch) {
            const { response, ...request } = durableRequest;
            await dispatchEvent({
                ...durableEventDispatch,
                request,
                response
            });
        }
    }
    const { response: givenFns } = getConfig();
    const responseFns = Array.isArray(givenFns) ? givenFns : (givenFns ? [givenFns] : []);
    if (responseFns.length) {
        await Promise.all(
            responseFns.map(async (fn) => fn(response.clone(), request, durableRequest))
        );
    }
}

export const removeFetchDispatcherFunction = dispatcher("fetch", async (event, dispatch) => {
    const { signal, controller } = createSignal(event);
    ok(isDurableFetchEventData(event));
    const {
        promise,
        handled,
        respondWith
    } = createRespondWith(event);
    const {
        wait,
        waitUntil
    } = createWaitUntil(event);
    let request: Request;

    try {
        request = await fromDurableRequest(event.request);
    } catch (error) {
        throw new Error("Could not create request from event");
    }

    try {
        const requestEvent: DurableEventData = {
            ...event,
            signal,
            request,
            handled,
            respondWith,
            waitUntil
        };

        type ServiceWorkerFetchFn = (request: Request, event: DurableEventData) => unknown;

        const entrypointArguments = event.entrypointArguments;

        async function dispatchServiceWorkerFnRequest(fn: unknown, fnError = "Expected entrypoint to be a function") {
            ok(typeof fn === "function", fnError);

            let returned;
            if (entrypointArguments) {
                const requestArguments = entrypointArguments.map(
                    key => key === "$event" ? requestEvent : requestEvent[key]
                );
                returned = fn(...requestArguments);
            } else {
                ok<ServiceWorkerFetchFn>(fn, fnError);
                returned = fn(request, requestEvent);
            }
            if (isLike<Promise<unknown>>(returned) && typeof returned === "object" && "then" in returned) {
                waitUntil(returned);
                returned = await returned;
            }
            if (returned instanceof Response) {
                respondWith(returned);
            }
        }

        const serviceWorker = getServiceWorkerModuleExports();
        if (event.entrypoint) {
            const entrypoint = serviceWorker[event.entrypoint];
            if (!entrypoint) {
                const names = Object.keys(serviceWorker);
                throw new Error(`Unknown entrypoint ${event.entrypoint}, expected one of ${names.join(", ")}`);
            }
            await dispatchServiceWorkerFnRequest(entrypoint);
        } else if (typeof serviceWorker.fetch === "function") {
            await dispatchServiceWorkerFnRequest(serviceWorker.fetch);
        } else if (typeof serviceWorker.default === "function") {
            await dispatchServiceWorkerFnRequest(serviceWorker.default);
        } else if (isLike<Record<string, unknown>>(serviceWorker.default) && typeof serviceWorker.default.fetch === "function") {
            await dispatchServiceWorkerFnRequest(serviceWorker.default.fetch);
        } else {
            await dispatch(requestEvent);
        }
        // We may not get a response as it is being handled elsewhere
        if (promise) {
            const response = await promise;
            await onFetchResponse(
                event,
                request,
                response
            );
        } else {
            await handled;
        }
        if (!signal.aborted) {
            await wait?.();
        }
    } catch (error) {
        if (!signal.aborted) {
            controller?.abort(error);
        }
        await onFetchResponse(
            event,
            request,
            Response.error()
        )
    } finally {
        if (!signal.aborted) {
            await wait?.();
            controller?.abort();
        }
    }
})