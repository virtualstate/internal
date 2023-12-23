import {DurableFetchEventData} from "../../fetch";
import {DurableEventData, DurableRequestData, fromDurableResponse, fromRequest, getFetchHeadersObject} from "../../data";
import {Pushable, createServiceWorkerWorker, executeServiceWorkerWorker} from "./execute";
import {isLike} from "../../is";
import type {FetchResponseMessage} from "./dispatch";
import type {DurableServiceWorkerRegistration} from "./container";
import {getOrigin} from "../../listen/config";
import {ServiceWorkerWorkerData} from "./worker";

export interface ServiceWorkerFetchOptions {
    tag?: string;
    entrypoint?: string;
    entrypointArguments?: string[];
    dispatch?: string | DurableEventData;
}

export interface FetchInit extends RequestInit, ServiceWorkerFetchOptions {
    duplex?: "half";
}

export interface FetchFn {
    (input: RequestInfo | URL, init?: FetchInit): Promise<Response>
}

export function createServiceWorkerFetch(registration: DurableServiceWorkerRegistration, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>, pushable?: Pushable<ServiceWorkerWorkerData, unknown>): FetchFn {
    let workerPromise: Promise<Pushable<ServiceWorkerWorkerData, unknown>> | undefined = undefined;
    return async (input, init) => {
        workerPromise = workerPromise || (pushable ? undefined: createServiceWorkerWorker());
        let request: Request | DurableRequestData;
        if (input instanceof Request) {
            request = input
        } else if (init?.body) {
            request = new Request(
                typeof input === "string" ?
                    new URL(input, getOrigin()).toString() :
                    input,
                {
                    duplex: "half",
                    ...init,
                }
            );
        } else {
            request = {
                url: new URL(input, getOrigin()).toString(),
                method: init?.method,
                headers: getFetchHeadersObject(
                    new Headers(init?.headers)
                )
            };
        }
        return executeServiceWorkerFetch(
            registration,
            request,
            init,
            serviceWorkerInit,
            pushable ?? await workerPromise
        );
    }
}

export async function executeServiceWorkerFetch(registration: DurableServiceWorkerRegistration, request: Request | DurableRequestData, options?: ServiceWorkerFetchOptions, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>, pushable?: Pushable<ServiceWorkerWorkerData, unknown>) {
    return executeServiceWorkerFetchEvent(registration, {
        type: "fetch",
        request: request instanceof Request ?
            await fromRequest(request) :
            request,
        virtual: true,
        dispatch: options?.dispatch,
        entrypoint: options?.entrypoint,
        entrypointArguments: options?.entrypointArguments
    }, serviceWorkerInit);
}

export async function executeServiceWorkerFetchEvent(registration: DurableServiceWorkerRegistration, event: DurableFetchEventData, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>, pushable?: Pushable<ServiceWorkerWorkerData, unknown>) {
    const { MessageChannel } = await import("node:worker_threads");

    let data: AsyncIterable<unknown>;
    const input: ServiceWorkerWorkerData = {
        ...serviceWorkerInit,
        serviceWorkerId: registration.durable.serviceWorkerId,
        event,
        channel: new MessageChannel()
    };

    if (pushable) {
        data = pushable.push(input);
    } else {
        data = executeServiceWorkerWorker(input);
    }

    const iterator = data[Symbol.asyncIterator]();

    return getResponse();

    async function getResponse() {
        const message = await next();
        if (!message) {
            throw new Error("Unable to retrieve response");
        }
        return fromDurableResponse(message.response)
    }

    async function next() {
        const { value, done } = await iterator.next();
        if (done) {
            await iterator.return?.();
        }
        if (!isLike<FetchResponseMessage>(value)) {
            return undefined;
        }
        return value;
    }


}