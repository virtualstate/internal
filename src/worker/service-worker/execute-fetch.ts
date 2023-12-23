import {DurableFetchEventCache, DurableFetchEventData} from "../../fetch";
import {DurableEventData, DurableRequestData, fromDurableResponse, fromRequest, getFetchHeadersObject} from "../../data";
import {executeServiceWorkerWorker} from "./execute";
import {isLike, ok} from "../../is";
import type {FetchResponseMessage} from "./dispatch";
import type {DurableServiceWorkerRegistration} from "./container";
import {getOrigin} from "../../listen/config";
import {ServiceWorkerWorkerData} from "./worker";

export interface ServiceWorkerFetchOptions {
    tag?: string;
    entrypoint?: string;
    dispatch?: string | DurableEventData;
}

export interface FetchInit extends RequestInit, ServiceWorkerFetchOptions {
    duplex?: "half";
}

export interface FetchFn {
    (input: RequestInfo | URL, init?: FetchInit): Promise<Response>
}

export function createServiceWorkerFetch(registration: DurableServiceWorkerRegistration, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>): FetchFn {
    return (input, init) => {
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
            serviceWorkerInit
        );
    }
}

export async function executeServiceWorkerFetch(registration: DurableServiceWorkerRegistration, request: Request | DurableRequestData, options?: ServiceWorkerFetchOptions, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>) {
    return executeServiceWorkerFetchEvent(registration, {
        type: "fetch",
        request: request instanceof Request ?
            await fromRequest(request) :
            request,
        virtual: true,
        dispatch: options?.dispatch,
        entrypoint: options?.entrypoint,
    }, serviceWorkerInit);
}

export async function executeServiceWorkerFetchEvent(registration: DurableServiceWorkerRegistration, event: DurableFetchEventData, serviceWorkerInit?: Partial<ServiceWorkerWorkerData>) {
    const { MessageChannel } = await import("node:worker_threads");

    const data = executeServiceWorkerWorker({
        ...serviceWorkerInit,
        serviceWorkerId: registration.durable.serviceWorkerId,
        event,
        channel: new MessageChannel()
    });

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