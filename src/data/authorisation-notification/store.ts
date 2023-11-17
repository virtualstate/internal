import {getKeyValueStore} from "../kv";
import {AuthorisationNotification} from "./types";

const STORE_NAME = "authorisationNotification" as const;

export function getAuthorisationNotificationStore() {
    return getKeyValueStore<AuthorisationNotification>(STORE_NAME, {
        counter: false
    });
}