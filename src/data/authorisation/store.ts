import {getKeyValueStore} from "../kv";
import {Authorisation} from "./types";

const STORE_NAME = "authorisation" as const;

export function getAuthorisationStore() {
    return getKeyValueStore<Authorisation>(STORE_NAME, {
        counter: false
    });
}