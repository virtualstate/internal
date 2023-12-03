import {DurableEvent, DurableEventData} from "../../data";
import {isLike, ok} from "../../is";
import {createHash} from "node:crypto";
import {index} from "../../content-index";
import {DurableSyncManager, sync} from "../../sync";
import {addEventListener} from "../../events/schedule/schedule";
import {dispatchEvent} from "../../events";
import {DurablePeriodicSyncManager} from "../../periodic-sync";
import {getInternalStorageBucket, InternalBucket} from "../../storage-buckets/internal";
import {getOrigin} from "../../listen";

export type DurableServiceWorkerRegistrationState = "pending" | "installing" | "installed" | "activating" | "activated";

export interface DurableServiceWorkerRegistrationData {
    serviceWorkerId: string;
    registrationState: DurableServiceWorkerRegistrationState;
    registrationStateAt: string;
    createdAt: string;
    registeredAt: string;
    initialUrl: string;
    url: string;
    origin: string;
    baseURL: string;
    options?: RegistrationOptions;
}

const STORE_NAME = "serviceWorker";

function getServiceWorkerRegistrationStore(internalBucket: InternalBucket = getInternalStorageBucket()) {
    return internalBucket.getKeyValueStore<DurableServiceWorkerRegistrationData>(STORE_NAME, {
        counter: false
    })
}

export function listServiceWorkerIds(internalBucket: InternalBucket = getInternalStorageBucket()) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
    return store.keys();
}

export async function listServiceWorkers(internalBucket: InternalBucket = getInternalStorageBucket()) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
    const values = await store.values();
    return values.map(value => new DurableServiceWorkerRegistration(value, {
        internalBucket
    }));
}

export async function getServiceWorkerRegistrationState(internalBucket: InternalBucket, serviceWorkerId: string) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
    const existing = await store.get(serviceWorkerId);
    ok(existing, "Expected to find registered serviceWorkerId");
    return existing.registrationState;
}

export async function setServiceWorkerRegistrationState(internalBucket: InternalBucket, serviceWorkerId: string, registrationState: DurableServiceWorkerRegistrationState) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
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

export async function deregisterServiceWorker(internalBucket: InternalBucket, serviceWorkerId: string) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
    await store.delete(serviceWorkerId);
}

export async function getDurableServiceWorkerRegistrationData(internalBucket: InternalBucket, serviceWorkerId: string, options?: DurableServiceWorkerRegistrationOptions) {
    const store = getServiceWorkerRegistrationStore(internalBucket);
    const registration = await store.get(serviceWorkerId);
    ok(registration, "Service worker not registered");
    return registration;
}

export async function getDurableServiceWorkerRegistration(internalBucket: InternalBucket, serviceWorkerId: string, options?: DurableServiceWorkerRegistrationOptions) {
    const registration = await getDurableServiceWorkerRegistrationData(internalBucket, serviceWorkerId);
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
    internalBucket?: InternalBucket;
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
    private readonly internalBucket: InternalBucket;

    constructor(data: DurableServiceWorkerRegistrationData, { isCurrentGlobalScope, internalBucket = getInternalStorageBucket() }: DurableServiceWorkerRegistrationOptions = {}) {
        this.isCurrentGlobalScope = !!isCurrentGlobalScope;
        this.#onDurableData(data);
        if (this.isCurrentGlobalScope) {
            this.unregisterListener = addEventListener(DURABLE_SERVICE_WORKER_REGISTRATION_UPDATE, this.#onDurableDataEvent);
        }
        this.internalBucket = internalBucket;
        this.sync = new DurableSyncManager();
        this.periodicSync = new DurablePeriodicSyncManager();
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
        await deregisterServiceWorker(this.internalBucket, this.durable.serviceWorkerId);
    }

    async update(): Promise<void>
    async update(): Promise<void>
    async update() {
        // TODO this shouldn't be the thing updating this state...
        // Just happens to be a good place for it, but we will also be changing this _after_ we do the normal update
        // operation if it can be done
        const data = await getDurableServiceWorkerRegistrationData(this.internalBucket, this.durable.serviceWorkerId);
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

export interface DurableServiceWorkerContainerOptions {
    internalBucket?: InternalBucket
}

export class DurableServiceWorkerContainer {

    private internalBucket: InternalBucket;

    constructor({ internalBucket = getInternalStorageBucket() }: DurableServiceWorkerContainerOptions = {}) {
        this.internalBucket = internalBucket;
    }

    async register(url: string, options?: RegistrationOptions) {
        const instance = new URL(url, getServiceWorkerUrl());
        ok(instance.protocol === "file:", "Only file service workers supported at this time");
        const store = getServiceWorkerRegistrationStore(this.internalBucket);
        const serviceWorkerId = getServiceWorkerId(instance.toString());
        const existing = await store.get(serviceWorkerId);
        if (existing) {
            const instance = new DurableServiceWorkerRegistration(existing);
            if (existing.registrationState === "activating") {
                // TODO
            }
            return instance;
        }
        const workerOrigin = instance.protocol === "file:" ?
            getOrigin() :
            instance.origin;
        const origin = options?.scope ?
            new URL(options.scope, workerOrigin).origin :
            workerOrigin;
        const baseURL = options?.scope ?
            new URL(options.scope, origin).toString() :
            new URL(url, origin).toString();

        const registeredAt = new Date().toISOString();
        const registration: DurableServiceWorkerRegistrationData = {
            serviceWorkerId,
            createdAt: existing?.createdAt || registeredAt,
            registeredAt,
            registrationState: "pending",
            registrationStateAt: registeredAt,
            initialUrl: url.toString(),
            url: instance.toString(),
            origin,
            baseURL,
            options
        };
        await store.set(serviceWorkerId, registration);
        return new DurableServiceWorkerRegistration(registration);
    }

    async getRegistration(clientUrl?: string) {
        ok(clientUrl, "Default client url not supported, please provide a client url to get");
        const serviceWorkerId = getServiceWorkerId(clientUrl);
        return getDurableServiceWorkerRegistration(this.internalBucket, serviceWorkerId);
    }

    async getRegistrations() {
        const store = getServiceWorkerRegistrationStore(this.internalBucket);
        const serviceWorkerIds = await store.keys();
        return await Promise.all(
            serviceWorkerIds.map(serviceWorkerId => getDurableServiceWorkerRegistration(this.internalBucket, serviceWorkerId))
        );
    }

    [Symbol.asyncIterator]() {
        const store = getServiceWorkerRegistrationStore(this.internalBucket);
        return store[Symbol.asyncIterator]();
    }
}

export const serviceWorker = new DurableServiceWorkerContainer();
