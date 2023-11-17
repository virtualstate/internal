import {getAttendeeStore} from "./store";

export async function deleteAttendee(attendeeId: string) {
   const store = getAttendeeStore();
   return store.delete(attendeeId);
}