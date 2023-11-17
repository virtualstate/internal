import {DurableFetchEventData} from "../../fetch";
import {DurableRequestData, fromDurableResponse, fromRequest, getFetchHeadersObject} from "../../data";
import {executeServiceWorkerWorker} from "./execute";
import {isLike, ok} from "../../is";
import type {FetchResponseMessage} from "./dispatch";
import {DurableServiceWorkerRegistration, serviceWorker} from "./container";
import {getOrigin} from "../../listen/config";

export async function registerServiceWorkerFetch(worker: string, options?: RegistrationOptions) {
    const registration = await serviceWorker.register(worker, options);
    return createServiceWorkerFetch(registration);
}

export function createServiceWorkerFetch(registration: DurableServiceWorkerRegistration): typeof fetch {
    return (input: RequestInfo, init?: RequestInit) => {
        let request: Request | DurableRequestData;
        if (input instanceof Request) {
            request = input
        } else if (init?.body) {
            request = new Request(input, init);
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
            request
        );
    }
}

export async function executeServiceWorkerFetch(registration: DurableServiceWorkerRegistration, request: Request | DurableRequestData) {
    return executeServiceWorkerFetchEvent(registration, {
        type: "fetch",
        request: request instanceof Request ?
            await fromRequest(request) :
            request,
        virtual: true,
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
        return fromDurableResponse({
            ...message.response,
            body: createBody()
        })
    }

    function createBody(): undefined | BodyInit {
        const stream = new ReadableStream({
            async pull(controller) {
                const message = await next();
                if (!message) {
                    return controller.close();
                }
                if (message.data) {
                    controller.enqueue(message.data);
                }
            },
            async cancel() {
                await iterator.return?.();
            }
        });
        ok<BodyInit>(stream);
        return stream;
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