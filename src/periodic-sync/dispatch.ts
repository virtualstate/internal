import {dispatcher} from "../events/schedule/schedule";
import {isLike, ok} from "../is";
import {dispatchSyncEvent, SyncDurableEventData} from "../sync/dispatch";
import {getPeriodicSyncTagRegistrationState, setPeriodicSyncTagRegistrationState} from "./manager";

export interface PeriodicSyncDurableEventData extends SyncDurableEventData {
    tag: string;
    lastChance?: boolean;
}

export function isPeriodicSyncDurableEventData(event: unknown): event is PeriodicSyncDurableEventData {
    return !!(
        isLike<Partial<PeriodicSyncDurableEventData>>(event) &&
        event.type === "periodicsync" &&
        typeof event.tag === "string"
    );
}

export const removePeriodicSyncDispatcherFunction = dispatcher("periodicsync", async (event, dispatch) => {
    ok(isPeriodicSyncDurableEventData(event), "Expected periodicsync event with tag");
    await dispatchSyncEvent({
        event,
        dispatch,
        getRegistrationState: getPeriodicSyncTagRegistrationState,
        setRegistrationState: setPeriodicSyncTagRegistrationState,
        deregister: false
    });
})