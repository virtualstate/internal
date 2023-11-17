import {getDurableRequestStore} from "./store";

export function listDurableRequests() {
    const store = getDurableRequestStore();
    return store.values();
}