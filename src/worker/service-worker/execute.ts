import {ServiceWorkerWorkerData} from "./worker";
import {WorkerOptions} from "node:worker_threads";
import {getNodeWorkerForImportURL} from "../worker";
import {Push} from "@virtualstate/promise";
import {PushAsyncIterableIterator} from "@virtualstate/promise/src/push";
import {isLike, ok} from "../../is";
import {WORKER_BREAK, WORKER_ERROR, WORKER_INITIATED, WORKER_MESSAGE, WORKER_TERMINATE} from "./constants";
import {anAsyncThing, TheAsyncThing} from "@virtualstate/promise/the-thing";
import type {TransferListItem as NodeTransferListItem, MessageChannel as NodeMessageChannel} from "node:worker_threads";
import type {DurableEventData} from "../../data";
import {listTransferable} from "./transferrable";

export function getServiceWorkerWorkerWorker(options?: WorkerOptions) {
    return getNodeWorkerForImportURL("./default-worker.js", import.meta.url, {
        ...options
    });
}

export async function executeServiceWorkerWorkerMessage(data?: ServiceWorkerWorkerData): Promise<unknown> {
    const iterator = executeServiceWorkerWorker(data)[Symbol.asyncIterator]();
    const next = await iterator.next();
    await iterator.return?.();
    return next.value; // Could be void :)
}

export interface Pushable<T, R> {
    push(data: T): TheAsyncThing<R>
    close(): Promise<void>
}

export async function createServiceWorkerWorker(): Promise<Pushable<ServiceWorkerWorkerData, unknown>> {
    // console.log("Getting worker");
    const { MessageChannel: NodeMessageChannel } = await import("node:worker_threads");
    const defaultChannel = new NodeMessageChannel();
    const { port1, port2 } = defaultChannel;
    const worker = await getServiceWorkerWorkerWorker({
        workerData: port2,
        transferList: [
            port2
        ]
    });

    // console.log("Waiting for initiation of worker");
    await onInitiated();
    // console.log("Initiated worker");

    return {
        push,
        close
    }

    function push(data: ServiceWorkerWorkerData): TheAsyncThing {
        let channel: NodeMessageChannel = defaultChannel;
        const transfer = [
            ...listTransferable(data)
        ];
        let message = data;

        if (data.channel) {
            channel = data.channel;
            data.port = channel.port2;
            transfer.push(channel.port2);
            message = {
                ...message,
                channel: undefined
            };
        }

        const messages = new Push();

        function channelsClose() {
            channel.port1.off("message", onMessage);
            defaultChannel.port1.off("message", onDefaultMessage);
            // Note we are closing this off
            // Even though its externally provided...
            if (channel !== defaultChannel) {
                channel.port1.close();
                channel.port2.close();
            }
        }

        function pushClose() {
            messages.close();
            channelsClose();
        }

        function pushError(error: unknown) {
            messages.throw(error);
            channelsClose();
        }

        function onDefaultMessage(message: unknown) {
            if (message === WORKER_ERROR) {
                pushError("Unhandled worker error");
                return true;
            }
            if (message === WORKER_TERMINATE) {
                pushClose();
                return true;
            }
            if (!messages.open || message === WORKER_BREAK) {
                pushClose()
                return true;
            }
            return false;
        }

        function onMessage(message: unknown) {
            if (onDefaultMessage(message)) {
                return;
            }
            // Could be a void message
            messages.push(message);
        }
        channel.port1.on("message", onMessage);
        defaultChannel.port1.on("message", onDefaultMessage);


        ok<NodeTransferListItem[]>(transfer);
        try {
            worker.postMessage(message, transfer);
        } catch (error) {
            console.error("Could not post error to worker", error);
            pushError(error);
        }

        return anAsyncThing(onMessages());

        async function *onMessages() {
            try {
                yield * messages;
            } finally {
                pushClose();
            }
        }
    }

    // await new Promise(resolve => worker.addEventListener("connect", resolve));
    // console.log("Connected");

    async function close() {
        worker.postMessage(WORKER_TERMINATE);
        await worker.terminate();
        port2.close();
        port1.close();
    }

    function onInitiated() {
        return new Promise<void>(resolve => {
            port1.on("message", onMessage)
            worker.on("message", onMessage)
            // console.log("Listening on initiation worker message");

            // const interval = setInterval(() => {
            //     console.log("Parent interval")
            // }, 250);

            function onMessage(message: unknown) {
                if (message !== WORKER_INITIATED) return;
                port1.off("message", onMessage);
                worker.off("message", onMessage);
                // clearInterval(interval);
                resolve();
            }
        })
    }

}

export async function * executeServiceWorkerWorker(data?: ServiceWorkerWorkerData): AsyncIterable<unknown> {
    const worker = await createServiceWorkerWorker();

    try {
        yield * worker.push(data);
    } finally {
        await worker.close();
    }

}

export async function dispatchServiceWorkerEvent(event: DurableEventData) {
    await executeServiceWorkerWorkerMessage({
        serviceWorkerId: event.serviceWorkerId,
        event
    });
}