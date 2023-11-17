import { getKeyValueStore } from "../kv";
import { Inventory } from "./types";

const STORE_NAME = "inventory" as const;

export function getInventoryStore() {
  return getKeyValueStore<Inventory>(STORE_NAME, {
    counter: true
  });
}
