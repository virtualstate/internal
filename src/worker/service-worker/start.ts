import {isServiceWorker} from "./config";
import {isNumberString, ok} from "../../is";
import {SERVICE_WORKER_ID, SERVICE_WORKER_URL, SERVICE_WORKER_LISTEN_PORT, SERVICE_WORKER_LISTEN_HOSTNAME} from "../../config";
import {serviceWorker} from "./container";
import {onServiceWorkerWorkerData} from "./worker";
import {createServer, IncomingMessage, ServerResponse} from "node:http";
import {createRespondWith} from "../../fetch";
import {dispatchEvent} from "../../events";
import {ReadableStream} from "node:stream/web";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";

export interface WorkerStartOptions {
    id?: string;
    url: string;
    listen?: {
        hostname?: string;
        port?: number | string;
        origin?: string;
    }
}

const DEFAULT_OPTIONS: WorkerStartOptions = {
    id: SERVICE_WORKER_ID,
    url: SERVICE_WORKER_URL,
    listen: {
        hostname: SERVICE_WORKER_LISTEN_HOSTNAME,
        port: SERVICE_WORKER_LISTEN_PORT
    }
}

export async function start(options: WorkerStartOptions = DEFAULT_OPTIONS) {
    const { url } = options;
    ok(url, "Expected SERVICE_WORKER_URL");

    // Ensure registered
    const registration = await serviceWorker.register(url);

    await onServiceWorkerWorkerData({
        serviceWorkerId: registration.durable.serviceWorkerId
    })

    let close = async () => {};

    if (isServiceWorkerListen(options)) {
        close = await listen({
            ...options,
            id: registration.durable.serviceWorkerId,
            listen: {
                origin: registration.durable.origin || registration.durable.baseURL || registration.durable.url,
                ...options.listen
            }
        });
    }

    return close;
}

function isServiceWorkerListen(options = DEFAULT_OPTIONS) {
    // Can be 0, which means, allocate port automatically
    return isNumberString(DEFAULT_OPTIONS.listen.port)
}

async function listen({ id: serviceWorkerId, listen: { port, hostname, origin }}: WorkerStartOptions) {

    const server = createServer(onServerMessage);

    await new Promise<void>(resolve => {
        server.listen(Number(port), hostname, resolve)
    });

    return () => new Promise<void>(resolve => server.close(() => resolve()))

    // async but local try catch finally
    async function onServerMessage(incomingMessage: IncomingMessage, serverResponse: ServerResponse) {
        try {
            const { respondWith, promise, handled } = createRespondWith();

            const headers = new Headers(
                Object.entries(incomingMessage.headers)
                    .map(([key, value]): [string, string] => [
                        key,
                        Array.isArray(value) ? value.join(", ") : value
                    ])
            );

            let body = undefined;
            const method = incomingMessage.method.toLowerCase();

            if (method !== "get" && method !== "head") {
                ok<{ from(iterable: AsyncIterable<unknown>): ReadableStream }>(ReadableStream)
                ok(ReadableStream.from, "Expected node 20.6.0 with ReadableStream.from")
                body = ReadableStream.from(incomingMessage)
            }

            const init: RequestInit & { duplex: unknown } = {
                method,
                body,
                duplex: "half",
                headers
            }
            const eventPromise = dispatchEvent({
                type: "fetch",
                request: new Request(new URL(incomingMessage.url, origin), init),
                respondWith,
                handled,
                serviceWorkerId,
                virtual: true
            })
            const response = await Promise.race([
                promise,
                // Non resolving, but throwable promise
                eventPromise.then(() => new Promise<Response>(() => {}))
            ]);
            const nodeReadable: unknown = Readable;
            ok<{ fromWeb(stream: unknown): Readable }>(nodeReadable)
            response.headers.forEach((value, key) => {
                serverResponse.appendHeader(key, value);
            })
            serverResponse.writeHead(response.status, response.statusText);
            if (response.body) {
                const stream = nodeReadable.fromWeb(response.body);
                await pipeline(stream, serverResponse);
            } else {
                serverResponse.end();
            }
            await eventPromise;
        } catch (error) {
            console.error(error);
            if (!serverResponse.headersSent) {
                serverResponse.writeHead(500);
                serverResponse.end(String(error));
            } else {
                // ??
                serverResponse.end();
            }
        }
    }
}