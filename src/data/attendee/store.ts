import {getKeyValueStore} from "../kv";
import {Attendee} from "./types";

const STORE_NAME = "attendee" as const;

export function getAttendeeStore() {
    return getKeyValueStore<Attendee>(STORE_NAME, {
        counter: true
    });
}