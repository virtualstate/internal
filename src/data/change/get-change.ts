import { getChangeStore } from "./store";
import {Change, ChangeIdentifier} from "./types";

export async function getChange(identifier: ChangeIdentifier): Promise<Change> {
  const store = getChangeStore(identifier);
  return store.get(identifier.changeId);
}