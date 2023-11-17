import { getKeyValueStore } from "../kv";
import { Organisation } from "./types";

const STORE_NAME = "organisation" as const;

export function getOrganisationStore<O extends Organisation = Organisation>() {
  return getKeyValueStore<O>(STORE_NAME, {
    counter: true
  });
}
