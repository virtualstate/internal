import {setAttendee} from "./set-attendee";
import {Attendee, AttendeeData} from "./types";

export async function createAttendeeReferences(input: (string | AttendeeData)[]): Promise<Attendee[]> {
    const attendeeInput = parseAttendeeReferences(input);
    return attendeeInput.length ? await Promise.all(
        attendeeInput.map(setAttendee)
    ) : [];
}

export function getAttendeeReferenceMap(attendees: Attendee[]) {
    return new Map(
        attendees.map(attendee => [attendee.reference, attendee])
    );
}

export function parseAttendeeReferences(attendees: (AttendeeData | string)[]): AttendeeData[] {
    return [
        ...(attendees ?? []).map(attendee => {
            if (typeof attendee === "string") {
                return { reference: attendee }
            }
            return attendee;
        })
    ]
        .filter(
            (value, index, array) => {
                const before = array.slice(0, index);
                return !before.find(other => other.reference === value.reference);
            }
        )
}