import {getMembershipStore} from "./store";

export function getMembership(membershipId: string) {
    const store = getMembershipStore();
    return store.get(membershipId);
}