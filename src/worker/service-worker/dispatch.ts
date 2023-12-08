import {
    DurableEventData,
    DurableResponseData, fromRequestResponse,
    fromRequestResponseWithoutBody
} from "../../data";
import {ServiceWorkerWorkerData} from "./worker";
import {createRespondWith, DurableFetchEventData, isDurableFetchEventData} from "../../fetch";
import {dispatchEvent} from "../../events";
import {ok} from "../../is";
import {dispatchScheduledDurableEvents} from "../../events/schedule/dispatch-scheduled";
import {listTransferable} from "./transferrable";

export interface FetchResponseMessage {
    type: "fetch:response";
    index: number;
    response?: DurableResponseData;
    data?: Uint8Array;
}

export async function dispatchWorkerEvent(event: DurableEventData, context: ServiceWorkerWorkerData) {
    if (isDurableFetchEventData(event)) {
        return dispatchWorkerFetchEvent(event, context);
    } else {
        return dispatchScheduledDurableEvents({
            event
        })
    }
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

    // console.log("dispatching service worker event");
    const eventPromise = dispatchEvent(dispatch);

    const response = await Promise.any<Response>([
        promise,
        // Non resolving promise
        // But will reject if thrown
        eventPromise.then<Response>(() => new Promise(() => {}))
    ]);

    // console.log("Emit response");

    const { response: output } = await fromRequestResponse(event.request, response);

    emit({
        response: output
    });

    // const reader = response.body.getReader();
    //
    // let chunk;
    // do {
    //     chunk = await reader.read();
    //     if (!chunk.done) {
    //         emit({
    //             data: chunk.value
    //         });
    //     }
    // } while (chunk.done);

    await eventPromise;

    function emit(message: Partial<FetchResponseMessage>) {
        const index = trackingIndex += 1;
        const complete: FetchResponseMessage = {
            ...message,
            index,
            type: "fetch:response"
        }
        try {
            port.postMessage(complete, listTransferable(complete));
        } catch (error) {
            console.error("Failed to emit", error);
            throw error;
        }
    }

}