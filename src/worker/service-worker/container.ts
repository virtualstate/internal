import {DurableEvent, DurableEventData, getKeyValueStore} from "../../data";
import {virtual} from "../../events/virtual/virtual";
import {isLike, ok} from "../../is";
import {createHash} from "node:crypto";
import {index} from "../../content-index";
import {DurableSyncManager, sync} from "../../sync";
import {addEventListener} from "../../events/schedule/schedule";
import {dispatchEvent} from "../../events";
import {DurablePeriodicSyncManager} from "../../periodic-sync";

export type DurableServiceWorkerRegistrationState = "pending" | "installing" | "installed" | "activating" | "activated";

export interface DurableServiceWorkerRegistrationData {
    serviceWorkerId: string;
    registrationState: DurableServiceWorkerRegistrationState;
    registrationStateAt: string;
    createdAt: string;
    registeredAt: string;
    initialUrl: string;
    url: string;
    options?: RegistrationOptions;
}

const STORE_NAME = "serviceWorker";

function getServiceWorkerRegistrationStore() {
    return getKeyValueStore<DurableServiceWorkerRegistrationData>(STORE_NAME, {
        counter: false
    })
}

export async function getServiceWorkerRegistrationState(serviceWorkerId: string) {
    const store = getServiceWorkerRegistrationStore();
    const existing = await store.get(serviceWorkerId);
    ok(existing, "Expected to find registered serviceWorkerId");
    return existing.registrationState;
}

export async function setServiceWorkerRegistrationState(serviceWorkerId: string, registrationState: DurableServiceWorkerRegistrationState) {
    const store = getServiceWorkerRegistrationStore();
    const existing = await store.get(serviceWorkerId);
    ok(existing, "Expected to find registered serviceWorkerId");
    const next: DurableServiceWorkerRegistrationData = {
        ...existing,
        registrationState,
        registrationStateAt: new Date().toISOString()
    };
    await store.set(serviceWorkerId, next);
    return next;
}

export async function deregisterServiceWorker(serviceWorkerId: string) {
    const store = getServiceWorkerRegistrationStore();
    await store.delete(serviceWorkerId);
}

export async function getDurableServiceWorkerRegistrationData(serviceWorkerId: string, options?: DurableServiceWorkerRegistrationOptions) {
    const store = getServiceWorkerRegistrationStore();
    const registration = await store.get(serviceWorkerId);
    ok(registration, "Service worker not registered");
    return registration;
}

export async function getDurableServiceWorkerRegistration(serviceWorkerId: string, options?: DurableServiceWorkerRegistrationOptions) {
    const registration = await getDurableServiceWorkerRegistrationData(serviceWorkerId);
    return new DurableServiceWorkerRegistration(registration, options);
}

const SERVICE_WORKER_STATES = [
    "parsed",
    "installing",
    "installed",
    "activating",
    "activated",
    "redundant"
];
function isServiceWorkerState(state: string): state is ServiceWorkerState  {
    return SERVICE_WORKER_STATES.includes(state);
}

function getServiceWorkerState(state: DurableServiceWorkerRegistrationState): ServiceWorkerState {
    if (isServiceWorkerState(state)) {
        return state;
    }
    return "parsed";
}

export class DurableServiceWorker {

    readonly scriptURL: string;
    readonly state: ServiceWorkerState;

    constructor(private data: DurableServiceWorkerRegistrationData) {
        this.scriptURL = data.url;
        this.state = getServiceWorkerState(data.registrationState);
    }

    postMessage(message: unknown, transfer: Transferable[]): Promise<void>;
    postMessage(message: unknown, options?: StructuredSerializeOptions, transfer?: Transferable[]): Promise<void>;
    async postMessage(message: unknown, ...args: unknown[]) {
        // TODO :)
    }

}

export interface DurableServiceWorkerRegistrationOptions {
    isCurrentGlobalScope?: boolean
}

const DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE = "serviceWorker:registration:update" as const;

interface DurableServiceWorkerUpdateEvent extends DurableEventData {
    type: typeof DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE;
    update: DurableServiceWorkerRegistrationData;
}

function isDurableServiceWorkerUpdateEvent(event: DurableEventData): event is DurableServiceWorkerUpdateEvent {
    return !!(
        isLike<DurableServiceWorkerUpdateEvent>(event) &&
        event.type === DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE &&
        event.update?.serviceWorkerId
    )
}

export function dispatchDurableServiceWorkerRegistrationUpdate(update: DurableServiceWorkerRegistrationData, data?: Partial<DurableEventData>) {
    const event: DurableServiceWorkerUpdateEvent = {
        virtual: true,
        ...data,
        type: DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE,
        update,
    };
    return dispatchEvent(event);
}

export class DurableServiceWorkerRegistration {

    active?: DurableServiceWorker;
    installing?: DurableServiceWorker;
    waiting?: DurableServiceWorker;

    index = index;
    sync: DurableSyncManager;
    periodicSync: DurablePeriodicSyncManager;

    public durable: DurableServiceWorkerRegistrationData;
    public readonly isCurrentGlobalScope: boolean;

    private unregisterListener;

    constructor(data: DurableServiceWorkerRegistrationData, { isCurrentGlobalScope }: DurableServiceWorkerRegistrationOptions = {}) {
        this.isCurrentGlobalScope = !!isCurrentGlobalScope;
        this.#onDurableData(data);
        if (this.isCurrentGlobalScope) {
            this.unregisterListener = addEventListener(DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE, this.#onDurableDataEvent);
        }
        this.sync = new DurableSyncManager({
            serviceWorkerId: data.serviceWorkerId
        });
        this.periodicSync = new DurablePeriodicSyncManager({
            serviceWorkerId: data.serviceWorkerId
        });
    }

    #onDurableDataEvent = (event: DurableEvent) => {
        ok(isDurableServiceWorkerUpdateEvent(event));
        this.#onDurableData(event.update);
    }

    #onDurableData = (data: DurableServiceWorkerRegistrationData) => {
        this.durable = data;
        this.waiting = undefined;
        this.active = undefined;
        this.installing = undefined;
        if (
            data.registrationState === "activating" ||
            data.registrationState === "activated"
        ) {
            this.active = new DurableServiceWorker(data);
        } else if (data.registrationState === "installed") {
            this.waiting = new DurableServiceWorker(data);
        } else /* if (data.registrationState === "pending" || data.registrationState === "installing") */ {
            this.installing = new DurableServiceWorker(data);
        }
    }

    async getNotifications(): Promise<Notification[]> {
        return [];
    }

    async showNotification(title: string, options?: NotificationOptions) {
        // TODO
    }

    async unregister() {
        this.unregisterListener?.();
        this.unregisterListener = undefined;
        await deregisterServiceWorker(this.durable.serviceWorkerId);
    }

    async update(): Promise<void>
    async update(): Promise<void>
    async update() {
        // TODO this shouldn't be the thing updating this state...
        // Just happens to be a good place for it, but we will also be changing this _after_ we do the normal update
        // operation if it can be done
        const data = await getDurableServiceWorkerRegistrationData(this.durable.serviceWorkerId);
        this.#onDurableData(data);
    }

}

function getServiceWorkerUrl() {
    const {
        SERVICE_WORKER_URL
    } = process.env;
    return SERVICE_WORKER_URL || `file://${process.cwd()}/`;
}

function getServiceWorkerId(url: string) {
    const {
        SERVICE_WORKER_PARTITION
    } = process.env;
    const serviceWorkerIdHash = createHash("sha512");
    if (SERVICE_WORKER_PARTITION) {
        serviceWorkerIdHash.update(SERVICE_WORKER_PARTITION);
    }
    serviceWorkerIdHash.update(url);
    return serviceWorkerIdHash.digest().toString("hex");
}

export class DurableServiceWorkerContainer {

    async register(url: string, options?: RegistrationOptions) {
        const instance = new URL(url, getServiceWorkerUrl());
        ok(instance.protocol === "file:", "Only file service workers supported at this time");
        const store = getServiceWorkerRegistrationStore();
        const serviceWorkerId = getServiceWorkerId(instance.toString());
        const existing = await store.get(serviceWorkerId);
        if (existing) {
            const instance = new DurableServiceWorkerRegistration(existing);
            if (existing.registrationState === "activating") {
                // TODO
            }
            return instance;
        }
        const registeredAt = new Date().toISOString();
        const registration: DurableServiceWorkerRegistrationData = {
            serviceWorkerId,
            createdAt: existing?.createdAt || registeredAt,
            registeredAt,
            registrationState: "pending",
            registrationStateAt: registeredAt,
            initialUrl: url.toString(),
            url: instance.toString(),
            options
        };
        await store.set(serviceWorkerId, registration);
        return new DurableServiceWorkerRegistration(registration);
    }

    async getRegistration(clientUrl?: string) {
        ok(clientUrl, "Default client url not supported, please provide a client url to get");
        const serviceWorkerId = getServiceWorkerId(clientUrl);
        return getDurableServiceWorkerRegistration(serviceWorkerId);
    }

    async getRegistrations() {
        const store = getServiceWorkerRegistrationStore();
        const serviceWorkerIds = await store.keys();
        return await Promise.all(
            serviceWorkerIds.map(serviceWorkerId => getDurableServiceWorkerRegistration(serviceWorkerId))
        );
    }

    [Symbol.asyncIterator]() {
        const store = getServiceWorkerRegistrationStore();
        return store[Symbol.asyncIterator]();
    }
}

export const serviceWorker = new DurableServiceWorkerContainer();
