import {v4} from "uuid";
import {DurableRequest, PartialDurableRequest} from "./types";
import {getDurableRequestStore} from "./store";
import {DurableEventData} from "../durable-event";
import {getDurableRequestIdForEvent} from "./get-durable-request";


export async function setDurableRequest(data: PartialDurableRequest) {
    const createdAt = new Date().toISOString();
    const durableRequestId = data.durableRequestId || v4();
    const durableRequest: DurableRequest = {
        ...data,
        createdAt,
        updatedAt: createdAt,
        durableRequestId,
    };
    const store = getDurableRequestStore();
    await store.set(durableRequestId, durableRequest);
    return durableRequest;
}

export function setDurableRequestForEvent(data: PartialDurableRequest, event: DurableEventData) {
    return setDurableRequest({
        ...data,
        durableRequestId: getDurableRequestIdForEvent(event)
    });
}