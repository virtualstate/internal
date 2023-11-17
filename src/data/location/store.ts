import { getKeyValueStore } from "../kv";
import { Location } from "./types";

const STORE_NAME = "location" as const;

export function getLocationStore() {
  return getKeyValueStore<Location>(STORE_NAME, {
    counter: true
  });
}
