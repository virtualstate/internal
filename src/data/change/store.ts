import {Change, ChangeTargetIdentifier} from "./types";
import {getExpiringStore} from "../expiring-kv";

const STORE_NAME = "change" as const;

export function getChangeStore({ target , type }: ChangeTargetIdentifier ) {
  return getExpiringStore<Change>(STORE_NAME, {
    counter: true,
    prefix: `change:${type}:target:${target.type}`
  });
}