import {
    DurableEventData,
    DurableResponseData,
    fromRequestResponseWithoutBody
} from "../../data";
import {ServiceWorkerWorkerData} from "./worker";
import {createRespondWith, DurableFetchEventData, isDurableFetchEventData} from "../../fetch";
import {dispatchEvent} from "../../events";
import {ok} from "../../is";

export interface FetchResponseMessage {
    type: "fetch:response";
    index: number;
    response?: DurableResponseData;
    data?: Uint8Array;
}

export async function dispatchWorkerEvent(event: DurableEventData, context: ServiceWorkerWorkerData) {
    if (isDurableFetchEventData(event)) {
        return dispatchWorkerFetchEvent(event, context);
    }
    return dispatchEvent(event);
}

export async function dispatchWorkerFetchEvent(event: DurableFetchEventData, context: ServiceWorkerWorkerData) {
    let trackingIndex = -1;

    const { port } = context;

    if (!port) {
        // Dispatch as normal if no port
        return dispatchEvent(event);
    }

    const {
        promise,
        handled,
        respondWith
    } = createRespondWith();

    ok(promise);

    const dispatch = {
        ...event,
        handled,
        respondWith
    };

    const eventPromise = dispatchEvent(dispatch);

    const response = await Promise.any<Response>([
        promise,
        // Non resolving promise
        // But will reject if thrown
        eventPromise.then<Response>(() => new Promise(() => {}))
    ]);

    emit({
        response: fromRequestResponseWithoutBody(event.request, response)
    });

    const reader = response.body.getReader();

    let chunk;
    do {
        chunk = await reader.read();
        if (!chunk.done) {
            emit({
                data: chunk.value
            });
        }
    } while (chunk.done);

    await eventPromise;

    function emit(message: Partial<FetchResponseMessage>) {
        const index = trackingIndex += 1;
        const complete: FetchResponseMessage = {
            ...message,
            index,
            type: "fetch:response"
        }
        port.postMessage(complete);
    }

}