import {getMembershipStore} from "./store";

export async function deleteMembership(membershipId: string) {
   const store = getMembershipStore();
   return store.delete(membershipId);
}