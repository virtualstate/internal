import {DurableFetchEventData} from "../../fetch";
import {DurableRequestData, fromDurableResponse, fromRequest, getFetchHeadersObject} from "../../data";
import {executeServiceWorkerWorker} from "./execute";
import {isLike, ok} from "../../is";
import type {FetchResponseMessage} from "./dispatch";
import {DurableServiceWorkerRegistration, serviceWorker} from "./container";
import {getOrigin} from "../../listen/config";

export interface ServiceWorkerFetchOptions {
    tag?: string;
}

export interface FetchInit extends RequestInit, ServiceWorkerFetchOptions {
    duplex?: "half";
}

export interface FetchFn {
    (input: RequestInfo, init?: FetchInit): Promise<Response>
}

export async function registerServiceWorkerFetch(worker: string, options?: RegistrationOptions) {
    const registration = await serviceWorker.register(worker, options);
    return createServiceWorkerFetch(registration);
}

export function createServiceWorkerFetch(registration: DurableServiceWorkerRegistration): FetchFn {
    return (input, init) => {
        let request: Request | DurableRequestData;
        if (input instanceof Request) {
            request = input
        } else if (init?.body) {
            request = new Request(
                typeof input === "string" ?
                    new URL(input, getOrigin()).toString() :
                    input,
                init
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
            init
        );
    }
}

export async function executeServiceWorkerFetch(registration: DurableServiceWorkerRegistration, request: Request | DurableRequestData, options?: ServiceWorkerFetchOptions) {
    return executeServiceWorkerFetchEvent(registration, {
        type: "fetch",
        request: request instanceof Request ?
            await fromRequest(request) :
            request,
        virtual: true,
        tag: options?.tag
    });
}

export async function executeServiceWorkerFetchEvent(registration: DurableServiceWorkerRegistration, event: DurableFetchEventData) {
    const { ReadableStream } = await import("node:stream/web");
    const { MessageChannel } = await import("node:worker_threads");

    const data = executeServiceWorkerWorker({
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