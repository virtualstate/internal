import {getKeyValueStore} from "../kv";
import {Membership} from "./types";

const STORE_NAME = "membership" as const;
const IDENTIFIERS_STORE_NAME = `${STORE_NAME}:IdentifiersCounter` as const;

export function getMembershipStore() {
    return getKeyValueStore<Membership>(STORE_NAME, {
        counter: true
    });
}

export function getMembershipIdentifierCounterStore() {
    return getKeyValueStore<number>(IDENTIFIERS_STORE_NAME, {
        counter: false // Disables secondary counting on updates
    })
}