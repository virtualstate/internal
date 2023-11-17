import {DurableServiceWorkerRegistration} from "./container";
import {DurableCacheStorage, FetchEvent} from "../../fetch";
import {DurableContentIndex} from "../../content-index";
import {DurableSyncManager} from "../../sync";
import {DurableEventData} from "../../data";

export interface DurableServiceWorkerScope {
    registration: DurableServiceWorkerRegistration,
    caches: DurableCacheStorage,
    index: DurableContentIndex,
    sync: DurableSyncManager,
    serviceWorker: ServiceWorkerContainer
    self: DurableServiceWorkerScope,
    isSecureContext: boolean
    origin: string
    addEventListener(type: "fetch", fn: (event: FetchEvent) => void): void;
    addEventListener(type: "message", fn: (message: MessageEvent) => void): void;
    addEventListener(type: string, fn: (event: DurableEventData) => void): void;
    removeEventListener: typeof removeEventListener
}