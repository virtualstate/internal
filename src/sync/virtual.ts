import {SyncDurableEventData} from "./dispatch";
import {virtual} from "../events/virtual/virtual";
import {DurableSyncManager, getSyncTagStore} from "./manager";


export async function * generateVirtualSyncEvents(manager?: DurableSyncManager): AsyncIterable<SyncDurableEventData> {
    const store = getSyncTagStore();
    for await (const { tag, lastChance } of manager) {
        yield {
            // Utilise a durableEventId so that a lock is created per tag
            durableEventId: `${store.name}:${tag}`,
            type: "sync",
            tag,
            lastChance,
            virtual: true
        };

        if (lastChance) {
            const existing = await store.get(tag);
            if (existing)
                // TODO is this what lastChance mean for durable syncing... is it lastChance for this process?
                //
                // Returns true if the user agent will not make further synchronization attempts after the current attempt.
                await store.delete(tag);
        }
    }
}

export const removeSyncVirtualFunction = virtual(generateVirtualSyncEvents);