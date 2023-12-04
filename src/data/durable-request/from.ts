import {DurableBody, DurableBodyLike, DurableRequestData, DurableResponseData} from "./types";
import {isDurableBody} from "./is";
import {isAsyncIterable, isLike, ok} from "../../is";
import {getFile, readFile, save} from "../file";
import {v4} from "uuid";
import {DurableEventData} from "../durable-event";

function isReadableStreamLike(body: unknown): body is ReadableStream {
    return (
        isLike<ReadableStream>(body) &&
        typeof body.getReader === "function"
    );
}

export async function fromMaybeDurableBody(body: unknown): Promise<BodyInit> {
    if (typeof body === "string") {
        return body;
    }
    if (!body) {
        return undefined;
    }
    if (Buffer.isBuffer(body)) {
        return body
    }
    if (body instanceof ArrayBuffer || body instanceof FormData || body instanceof Uint8Array || body instanceof Blob) {
        return body;
    }
    if (isDurableBody(body)) {
        return fromDurableBody(body);
    }
    if (isReadableStreamLike(body)) {
        return body;
    }
    throw new Error("Unknown body type");
}

function instanceBroadcast(url: string) {
    return new BroadcastChannel(url);
}

async function fromDurableBroadcast({ value: token, url }: DurableBody): Promise<RequestInit["body"]> {
    console.log("fromDurableBroadcast", { url, token });
    ok(url, "Expected url for broadcast channel");





    return new ReadableStream({
        start(controller) {
            console.log("ReadableStream start");

            const instance = v4();
            const channel = new BroadcastChannel(url);

            if ("unref" in channel && channel.unref instanceof Function) {
                channel.unref();
            }

            async function onBroadcastMessage(event: BroadcastEvent) {
                console.log({ stream: event });
                if (event.token !== token) return console.log("stream unknown token");
                if (event.instance !== instance) return console.log("stream unknown instance");
                if (event.type === "close") {
                    console.log("stream closing")
                    return onReturn();
                }
                if (event.type === "error") {
                    console.log("stream error")
                    return controller.error(event.error ?? "error");
                }
                if (event.type === "value") {
                    console.log("stream value")
                    return controller.enqueue(event.value);
                }
                throw new Error(`Unknown type ${event.type}`);
            }

            // function onClose() {
            //     postMessage({
            //         type: "close"
            //     });
            //     onReturn();
            // }

            function onReturn() {
                console.log("stream onReturn");
                try {
                    controller.close();
                    console.log("stream controller.close");
                } catch (error) {
                    console.log("stream error", error)
                }
                channel.removeEventListener("message", onMessage);
                channel.close();
            }

            function onMessage(event: unknown) {
                console.log("fromDurableBroadcast message", event);
                if (!isBroadcastMessageEvent(event)) return event;
                const { data } = event;
                const promise = onBroadcastMessage(data);
                catchError(promise);
            }

            console.log("fromDurableBroadcast addEventListener")
            channel.addEventListener("message", onMessage)

            // Ask for a push of all the data. Ty
            console.log("fromDurableBroadcast push");
            postMessage({
                type: "push"
            });

            async function catchError(promise: Promise<void>) {
                promise
                    .catch(error => {
                        console.log("fromDurableBroadcast error", error);
                        onReturn();
                        postMessage({
                            type: "error",
                            error,
                        });
                    })
            }

            function postMessage(event: Omit<BroadcastEvent, "token" | "instance">) {
                channel.postMessage({
                    ...event,
                    instance,
                    token,
                });
            }
        }
    })



}

export async function fromDurableBody(body: DurableBody): Promise<RequestInit["body"]> {
    if (body.type === "base64") {
        return Buffer.from(body.value, body.type);
    }
    if (body.type === "broadcast") {
        return fromDurableBroadcast(body);
    }
    if (body.type === "cache") {
        const { url, value: cacheName } = body;
        ok(url, "Expected url to be provided to resolve cache body");
        const { caches } = await import("../../fetch");
        const cache = await caches.open(cacheName);
        const match = await cache.match(url);
        ok(match, "Expected match from cache for body");
        return match.blob();
    }
    ok(body.type === "file", `Unknown body type ${body.type}`);
    const file = await getFile(body.value);
    ok(file, `Expected to find file ${file.fileId}`);
    const found = await readFile(file);
    ok(found, `Expected to find contents for ${file.fileId}`);
    return found;
}

export async function fromDurableRequest(durableRequest: Request | DurableRequestData, getOrigin?: () => string) {
    const { url, method, headers, body: givenBody } = durableRequest;
    const body = await fromMaybeDurableBody(givenBody);
    return new Request(
        new URL(url, getOrigin?.()),
        {
            method,
            headers,
            body
        }
    );
}

export async function fromDurableResponse(durableResponse: Omit<DurableResponseData, "body"> & { body?: BodyInit | DurableBodyLike }) {
    const { body: givenBody, statusText, status, headers } = durableResponse;
    const body = await fromMaybeDurableBody(givenBody);
    return new Response(
        body,
        {
            status,
            statusText,
            headers
        }
    );
}

export interface FromRequestResponseOptions {
    fileName?: string;
    body?: DurableBodyLike;
    signal?: AbortSignal
    persist?: boolean;
}


export function getFetchHeadersObject(fetchHeaders: Headers) {
    const headers = new Headers(fetchHeaders);
    // Not sure if we ever get this header in node fetch
    // https://developer.mozilla.org/en-US/docs/Web/API/Cache#cookies_and_cache_objects
    // Maybe these headers were constructed by a user though
    headers.delete("Set-Cookie");
    return getHeadersObject(headers);
}

export function fromRequestWithoutBody(request: Request): DurableRequestData {
    return {
        url: request.url,
        method: request.method,
        headers: getFetchHeadersObject(request.headers),
        body: undefined
    }
}

export async function fromRequest(request: Request, options?: FromRequestResponseOptions) {
    return {
        ...fromRequestWithoutBody(request),
        body: await fromBody(request, options)
    }
}

export function fromRequestResponseWithoutBody(request: Pick<DurableRequestData, "url">, response: Response): DurableResponseData {
    return {
        headers: getFetchHeadersObject(response.headers),
        status: response.status,
        statusText: response.statusText,
        // response.url is empty if it was constructed manually
        // Should be same value anyway...
        url: response.url || request.url,
        body: undefined
    };
}

const BROADCAST_OPEN = "open" as const;
const BROADCAST_PULL = "pull" as const;
const BROADCAST_PUSH = "push" as const;
const BROADCAST_VALUE = "value" as const;
const BROADCAST_ERROR = "error" as const;
const BROADCAST_CLOSE = "close" as const;

interface BroadcastEvent extends DurableEventData {
    type:
        | typeof BROADCAST_OPEN
        | typeof BROADCAST_PULL
        | typeof BROADCAST_PUSH
        | typeof BROADCAST_VALUE
        | typeof BROADCAST_CLOSE
        | typeof BROADCAST_ERROR
    token: string;
    instance: string;
    error?: unknown;
    value?: unknown;
    index?: number;
}

export interface BroadcastMessageEvent {
    type: "message",
    data: BroadcastEvent
}


function isBroadcastMessageEvent(event: unknown): event is BroadcastMessageEvent {
    if (isLike<Partial<BroadcastMessageEvent>>(event)) {
        console.log(event.data, isBroadcastEvent(event.data), event.type);
    }
    return (
        isLike<Partial<BroadcastMessageEvent>>(event) &&
        event.type === "message" &&
        isBroadcastEvent(event.data)
    )
}

function isBroadcastEvent(event: unknown): event is BroadcastEvent {
    return (
        isLike<Partial<BroadcastEvent>>(event) &&
        (
            event.type === BROADCAST_PULL ||
            event.type === BROADCAST_PUSH ||
            event.type === BROADCAST_VALUE ||
            event.type === BROADCAST_CLOSE ||
            event.type === BROADCAST_ERROR||
            event.type === BROADCAST_OPEN
        ) &&
        typeof event.token === "string" &&
        typeof event.instance === "string"
    )
}

async function createBroadcastBody(input: Request | Response, options?: FromRequestResponseOptions): Promise<DurableBodyLike> {

    const url = new URL(`body-channel://${v4()}/${input.url || ""}"`).toString();
    const token = v4();
    const channel = new BroadcastChannel(url);

    const instancesWithBreak = new Set<string>();
    const instanceIterators = new Map<string, AsyncIterableIterator<unknown>>();
    const instanceIndex = new Map<string, number>();
    const instanceWait = new Map<string, Promise<void>>();

    function getIterator(instance: string) {
        const existing = instanceIterators.get(instance);
        if (existing) {
            return existing;
        }
        const iterator = generate();
        instanceIterators.set(instance, iterator);
        return iterator;
    }

    async function * generate() {
        const cloned = input.clone();
        if (isAsyncIterable(cloned.body)) {
            return yield * cloned.body;
        }
        throw new Error("Expected async iterable readable stream");
    }

    function hasBreak(instance: string) {
        return options?.signal?.aborted || instancesWithBreak.has(instance);
    }


    async function push({ instance }: BroadcastEvent) {
        let didBreak = false;
        for await (const value of getIterator(instance)) {
            if (hasBreak(instance)) {
                didBreak = true;
                break;
            }
            onInstanceValue(instance, value);
        }
        if (!didBreak) {
            console.log("end of iterator stream")
            await onInstanceClose(instance);
        }
    }

    function onInstanceValue(instance: string, value: unknown) {
        postMessage({
            type: "value",
            token,
            instance,
            value
        });
    }

    async function onInstanceClose(instance: string) {
        postMessage({
            type: "close",
            instance,
            token
        });
        await onInstanceReturn(instance);
    }

    async function onInstanceReturn(instance: string) {
        channel.removeEventListener("message", onMessage);
        channel.close();
        instancesWithBreak.delete(instance);
        instanceWait.delete(instance);
        instanceIndex.delete(instance);
        const existing = instanceIterators.get(instance);
        instanceIterators.delete(instance);
        try {
            await existing?.return?.();
        } catch {
            // Ghost error
        }
    }


    function getIndex({ instance }: BroadcastEvent) {
        const currentIndex = instanceIndex.get(instance) ?? -1;
        const index = currentIndex + 1;
        instanceIndex.set(instance, index);
        return index;
    }

    function postMessage(event: BroadcastEvent) {
        channel.postMessage({
            ...event,
            index: getIndex(event)
        });
    }

    async function catchError({ instance }: BroadcastEvent, promise: Promise<void>) {
        promise
            .catch(error => {
                instancesWithBreak.add(instance);
                postMessage({
                    type: "error",
                    error,
                    token,
                    instance
                });
            })
            .finally(() => onInstanceReturn(instance))
    }

    async function wait(event: BroadcastEvent, fn: (event: BroadcastEvent) => Promise<void>) {
        const { instance } = event;
        const existing = instanceWait.get(instance);
        if (existing) {
            const promise = existing.then(() => fn(event));
            instanceWait.set(instance, promise);
            return promise;
        } else {
            const promise = fn(event);
            // Don't catch an error as we want any error in an instance to break anyway
            instanceWait.set(instance, promise);
            return promise;
        }

    }

    async function pull({ instance }: BroadcastEvent) {
        const iterator = getIterator(instance);
        const next = await iterator.next();
        if (next.done) {
            console.log("end of iterator")
            await onInstanceClose(instance);
        } else {
            onInstanceValue(instance, next.value);
        }
    }

    async function onBroadcastEvent(event: BroadcastEvent) {
        console.log({ source: event });
        if (event.token !== token) return;
        if (event.type === "push") {
            return push(event);
        }
        if (event.type === "pull") {
            return wait(event, pull);
        }
        if (event.type === "close") {
            return onInstanceReturn(event.instance);
        }
        if (event.type === "error") {
            instancesWithBreak.add(event.instance);
            return onInstanceClose(event.instance);
        }
    }

    function onMessage(event: unknown) {
        console.log("createBroadcastBody message", event, isBroadcastMessageEvent(event));
        if (!isBroadcastMessageEvent(event)) return;
        const { data } = event;
        const promise = onBroadcastEvent(data);
        catchError(data, promise);
    }

    console.log("createBroadcastBody");
    channel.addEventListener("message", onMessage);

    return {
      type: 'broadcast',
      value: token,
      url
    };
}

async function createFileBody(cloned: Request | Response, contentType: string, options?: FromRequestResponseOptions): Promise<DurableBodyLike> {
    // // TODO warning, we might mislink some of these files...
    const file = await save({
        fileName: options?.fileName || v4(),
        contentType
    }, await cloned.blob());
    return {
        type: "file",
        value: file.fileId
    };
}

async function fromBody(input: Request | Response, options?: FromRequestResponseOptions): Promise<DurableBodyLike | undefined> {
    if (options?.body) {
        return options.body;
    }

    // TODO detect string based contentTypes
    const contentType = input.headers.get("Content-Type");
    const cloned = input.clone();
    if (contentType === "text/html" || contentType === "text/plain" || contentType?.startsWith("application/json") || contentType === "application/javascript") {
        return cloned.text();
    }

    if (options?.persist) {
        return createFileBody(cloned, contentType, options);
    }

    return createBroadcastBody(cloned, options)
}

export async function fromRequestResponse(request: Request, response: Response, options?: FromRequestResponseOptions): Promise<DurableRequestData> {
    const durableResponse: DurableResponseData = {
        ...fromRequestResponseWithoutBody(request, response),
        body: await fromBody(response, options)
    };
    return {
        ...fromRequestWithoutBody(request),
        response: durableResponse
    };
}

function getHeadersObject(headers?: Headers) {
    const output: Record<string, string> = {};
    if (!headers) {
        return output;
    }
    headers.forEach((value, key) => {
        output[key] = value;
    })
    return output;
}