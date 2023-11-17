import {dispatcher, DispatchEventFn} from "../events/schedule/schedule";
import {isLike, isSignalled, ok} from "../is";
import {createWaitUntil} from "../fetch";
import {DurableEventData} from "../data";
import {
    deregisterSyncTag,
    getSyncTagRegistrationState,
    setSyncTagRegistrationState,
    SyncTagRegistrationState
} from "./manager";

export interface SyncDurableEventData extends DurableEventData {
    tag: string;
    lastChance?: boolean;
}

export function isSyncDurableEventData(event: unknown): event is SyncDurableEventData {
    return !!(
        isLike<Partial<SyncDurableEventData>>(event) &&
        event.type === "sync" &&
        typeof event.tag === "string"
    );
}

export interface DispatchSyncEventOptions {
    event: SyncDurableEventData,
    setRegistrationState(tag: string, state: SyncTagRegistrationState): Promise<void | unknown>
    getRegistrationState(tag: string): Promise<SyncTagRegistrationState>;
    dispatch: DispatchEventFn
    deregister?: boolean;
}

export async function dispatchSyncEvent(options: DispatchSyncEventOptions) {
    const { event, setRegistrationState, getRegistrationState, dispatch, deregister } = options;
    const { tag, lastChance = false } = event;
    // const initialState = await getRegistrationState(tag);
    // Note that waiting or pending are allowed initial states
    // ok(initialState === "pending" || initialState === "waiting", "Expected event to be in pending state");
    const { signal, controller } = getSignal();
    const {
        wait,
        waitUntil
    } = createWaitUntil();
    try {
        await setRegistrationState(tag, "firing");
        await dispatch({
            lastChance,
            ...event,
            signal,
            waitUntil
        });
        await wait();
    } catch (error) {
        if (!signal.aborted) {
            controller?.abort(error);
        }
        if (await dispatchAgainIfReregistered()) {
            return;
        }
        if (lastChance) {
            throw await Promise.reject(error);
        }
        await setRegistrationState(tag, "waiting");
        return;
    } finally {
        if (!signal.aborted) {
            controller?.abort();
        }
        await wait();
    }

    if (await dispatchAgainIfReregistered()) {
        return;
    }

    if (deregister) {
        await deregisterSyncTag(tag);
    } else {
        await setRegistrationState(tag, "waiting");
    }

    async function dispatchAgainIfReregistered() {
        const state = await getRegistrationState(tag);
        if (state !== "reregisteredWhileFiring") {
            return false;
        }
        await dispatchSyncEvent(options);
        return true;
    }

    function getSignal() {
        if (isSignalled(event)) {
            return { signal: event.signal, controller: undefined } as const;
        }
        const controller = new AbortController();
        return {
            signal: controller.signal,
            controller
        } as const;
    }
}

export const removeSyncDispatcherFunction = dispatcher("sync", async (event, dispatch) => {
    ok(isSyncDurableEventData(event), "Expected sync event with tag");
    await dispatchSyncEvent({
        event,
        setRegistrationState: setSyncTagRegistrationState,
        getRegistrationState: getSyncTagRegistrationState,
        dispatch,
        deregister: true
    });
})