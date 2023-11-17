import { getKeyValueStore } from "../kv";
import { Service } from "./types";

const STORE_NAME = "service" as const;

export function getServiceStore<P extends Service = Service>() {
  return getKeyValueStore<P>(STORE_NAME, {
    counter: true
  });
}
