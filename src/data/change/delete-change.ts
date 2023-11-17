import { getChangeStore } from "./store";
import { ChangeIdentifier } from "./types";

export async function deleteChange(identifier: ChangeIdentifier): Promise<void> {
  const store = getChangeStore(identifier);
  return store.delete(identifier.changeId);
}