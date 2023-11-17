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
        durableEventDispatch = {
            durableEventId: v4(),
            ...event.dispatch
        };
    }
    const isRetain = durableEventDispatch || (event.durableEventId && event.retain !== false);
    let body: DurableBody;
    const givenCache = typeof event.cache === "string" ? { name: event.cache } : isDurableFetchEventCache(event.cache) ? event.cache : undefined;
    const cache =  givenCache ?? (isRetain ? { name: "fetch" } : undefined);
    if (cache) {
        const { name, always } = cache;
        if (response.ok || always) {
            const store = await caches.open(name);
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
    const request = await fromDurableRequest(event.request);
    try {
        await dispatch({
            ...event,
            signal,
            request,
            handled,
            respondWith,
            waitUntil
        });
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
        throw await Promise.reject(error);
    } finally {
        if (!signal.aborted) {
            await wait?.();
            controller?.abort();
        }
    }
})