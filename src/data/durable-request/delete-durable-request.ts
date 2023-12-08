import {getDurableRequestStore} from "./store";
import {DurableRequestData} from "./types";
import {isDurableBody} from "./is";
import {unlink} from "../file/unlink";

export async function deleteDurableRequest(durableRequestId: string) {
    const store = getDurableRequestStore();
    const existing = await store.get(durableRequestId);
    if (!existing) {
        return;
    }
    await deleteDurableRequestBody(existing);
    return store.delete(durableRequestId);
}

export async function deleteDurableRequestBody(durableRequest: DurableRequestData) {
    const fileIds = new Set<string>();
    if (isDurableBody(durableRequest.body) && durableRequest.body.type === "file" && typeof durableRequest.body.value === "string") {
        fileIds.add(durableRequest.body.value);
    }
    if (isDurableBody(durableRequest.response?.body) && durableRequest.response.body.type === "file" && typeof  durableRequest.response.body.value === "string") {
        fileIds.add(durableRequest.response.body.value);
    }
    if (!fileIds.size) {
        return;
    }
    await Promise.all(
        [...fileIds].map(id => unlink(id))
    );
}