import {Change, ChangeTarget, ChangeTargetIdentifier, ChangeTargetType} from "./types";
import { getChangeStore } from "./store";
import {isLike} from "../../is";

export interface ListChangesInput extends ChangeTargetIdentifier {
  target: ChangeTargetType | ChangeTarget;
}

export async function listChanges(options: ListChangesInput): Promise<Change[]> {
  const store = getChangeStore(options);
  let changes = await store.values();
  if (isChangeTarget(options.target)) {
    const id = options.target.id;
    changes = changes.filter(change => change.target.id === id);
  }
  return changes;
}

function isChangeTarget(target: ChangeTargetType | ChangeTarget): target is ChangeTarget {
  return isLike<ChangeTarget>(target) && !!target.id;
}