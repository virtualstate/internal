import {DurableBody, DurableBodyLike, DurableRequestData, DurableResponseData} from "./types";
import {isDurableBody} from "./is";
import {isLike, ok} from "../../is";
import {getFile, readFile, save} from "../file";
import {v4} from "uuid";

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

export async function fromDurableBody(body: DurableBody): Promise<RequestInit["body"]> {
    if (body.type === "source") {
        return body.value;
    }
    if (body.type === "base64") {
        ok(typeof body.value === "string", "Expected body value to be a string");
        return Buffer.from(body.value, body.type);
    }
    if (body.type === "cache") {
        const { url, value: cacheName } = body;
        ok(typeof cacheName === "string", "Expected body value to be a string");
        ok(url, "Expected url to be provided to resolve cache body");
        const { caches } = await import("../../fetch");
        const cache = await caches.open(cacheName);
        const match = await cache.match(url);
        ok(match, "Expected match from cache for body");
        return match.blob();
    }
    ok(body.type === "file", `Unknown body type ${body.type}`);
    ok(typeof body.value === "string", "Expected body value to be a string");
    const file = await getFile(body.value);
    ok(file, `Expected to find file ${file.fileId}`);
    const found = await readFile(file);
    ok(found, `Expected to find contents for ${file.fileId}`);
    return found;
}

export async function fromDurableRequest(durableRequest: Request | DurableRequestData, getOrigin?: () => string) {
    const { url, method, headers, body: givenBody } = durableRequest;
    const body = await fromMaybeDurableBody(givenBody);
    const init: RequestInit & { duplex?: unknown } = {
        method,
        headers,
        body,
        duplex: body ? "half" : undefined
    }
    return new Request(
        new URL(url, getOrigin?.()),
        init
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


export function getFetchHeadersObject(fetchHeaders: Headers | HeadersInit) {
    const headers = new Headers(fetchHeaders);
    // Not sure if we ever get this header in node fetch
    // https://developer.mozilla.org/en-US/docs/Web/API/Cache#cookies_and_cache_objects
    // Maybe these headers were constructed by a user though
    headers.delete("Set-Cookie");
    return getHeadersObject(headers);
}

export function fromRequestWithoutBody(request: Request | DurableRequestData): DurableRequestData {
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

    return {
        type: "source",
        value: cloned.body
    }
}

export async function fromRequestResponse(request: Request | DurableRequestData, response: Response, options?: FromRequestResponseOptions): Promise<DurableRequestData> {
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