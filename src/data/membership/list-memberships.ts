import { Membership } from "./types";
import { getMembershipStore } from "./store";

export interface ListMembershipsInput {}

export async function listMemberships({}: ListMembershipsInput = {}): Promise<
  Membership[]
> {
  const store = getMembershipStore();
  return store.values();
}
