import {DurableServiceWorkerRegistration} from "./container";
import {DurableCacheStorage, ExtendableEvent, FetchEvent} from "../../fetch";
import {DurableContentIndex} from "../../content-index";
import {SyncEvent} from "../../sync";
import {DurableEventData} from "../../data";
import {PeriodicSyncEvent} from "../../periodic-sync";
import {ActivateEvent, InstallEvent} from "./dispatchers";





export interface DurableServiceWorkerScope {
    registration: DurableServiceWorkerRegistration,
    caches: DurableCacheStorage,
    index: DurableContentIndex,
    serviceWorker: ServiceWorkerContainer
    self: DurableServiceWorkerScope,
    isSecureContext: boolean
    origin: string
    addEventListener(type: "fetch", fn: (event: FetchEvent) => void): void;
    addEventListener(type: "install", fn: (event: InstallEvent) => void): void;
    addEventListener(type: "activate", fn: (event: ActivateEvent) => void): void;
    addEventListener(type: "message", fn: (message: MessageEvent) => void): void;
    addEventListener(type: "sync", fn: (message: SyncEvent) => void): void;
    addEventListener(type: "periodicsync", fn: (message: PeriodicSyncEvent) => void): void;
    addEventListener(type: string, fn: (event: DurableEventData) => void): void;
    removeEventListener: typeof removeEventListener
}