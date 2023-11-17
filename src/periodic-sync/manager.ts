import {getKeyValueStore} from "../data";
import {ok} from "../is";
import {SyncTag, SyncTagRegistrationState} from "../sync";

export interface PeriodicSyncOptions {
    minInterval?: number;
}

export interface PeriodicSyncTag extends SyncTag, PeriodicSyncOptions {

}

const STORE_NAME = "periodicSyncTag";

function getPeriodicSyncTagStore() {
    return getKeyValueStore<PeriodicSyncTag>(STORE_NAME, {
        counter: false
    })
}

export async function getPeriodicSyncTagRegistration(tag: string) {
    const store = getPeriodicSyncTagStore();
    const existing = await store.get(tag);
    ok(existing, "Expected to find registered periodic sync tag");
    return existing;
}

export async function getPeriodicSyncTagRegistrationState(tag: string) {
    const existing = await getPeriodicSyncTagRegistration(tag);
    return existing.registrationState;
}

export async function setPeriodicSyncTagRegistrationState(tag: string, registrationState: SyncTagRegistrationState) {
    const existing = await getPeriodicSyncTagRegistration(tag);
    const next: SyncTag = {
        ...existing,
        registrationState,
        registrationStateAt: new Date().toISOString()
    };
    const store = getPeriodicSyncTagStore();
    await store.set(tag, next);
    return next;
}

export async function deregisterPeriodicSyncTag(tag: string) {
    const store = getPeriodicSyncTagStore();
    await store.delete(tag);
}

export class DurablePeriodicSyncManager {
    async register(tag: string, options?: PeriodicSyncOptions) {
        const store = getPeriodicSyncTagStore();
        const existing = await store.get(tag);
        const isFiring = existing?.registrationState === "firing"
        if (existing && !isFiring) {
            return;
        }
        let registrationState: SyncTagRegistrationState = "pending";
        if (isFiring) {
            registrationState = "reregisteredWhileFiring";
        }
        const registeredAt = new Date().toISOString();
        await store.set(tag, {
            tag,
            createdAt: existing?.createdAt || registeredAt,
            registeredAt,
            registrationState,
            registrationStateAt: registeredAt,
            ...options
        });
    }

    async getTags() {
        const store = getPeriodicSyncTagStore();
        return await store.keys();
    }

    async unregister(tag: string) {
        await deregisterPeriodicSyncTag(tag);
    }
}

export const periodicSync = new DurablePeriodicSyncManager();

