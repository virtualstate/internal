import {getAttendeeStore} from "./store";

export function getAttendee(attendeeId: string) {
    const store = getAttendeeStore();
    return store.get(attendeeId);
}