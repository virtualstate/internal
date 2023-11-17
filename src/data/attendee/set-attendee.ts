import {getAttendeeStore} from "./store";
import {Attendee, PartialAttendee} from "./types";
import {createHash} from "crypto";
import {getAttendee} from "./get-attendee";
import {entries} from "../entries";
import {getMaybePartner, getMaybeUser, isUnauthenticated} from "../../authentication";
import {v4} from "uuid";
import {ok} from "../../is";

const {
    ATTENDEE_DISABLE_PARTITION,
    ATTENDEE_PARTITION,
} = process.env;

function getPartitionPrefix() {
    if (ATTENDEE_PARTITION) {
        return ATTENDEE_PARTITION;
    }
    const partner = getMaybePartner();
    // If authenticated, attendee information will be retained across happenings
    if (partner?.partnerId) {
        return `partner:${partner.partnerId}:`
    }
    const user = getMaybeUser();
    if (user?.userId) {
        // Users can create their own attendees
        return `user:${user.userId}:`
    }
    ok(isUnauthenticated(), "Expected user or partner if not anonymous");
    // Random every time if no authentication :)
    // If creating a happening tree, each new tree request will have a new set of attendees
    return v4();
}

/**
 * Allows partial update of an attendee, retains existing properties
 * @param data
 */
export async function setAttendee(data: PartialAttendee) {
    const store = getAttendeeStore();
    let reference = data.reference,
        attendeeId = data.attendeeId;
    // Allows for either reference or attendeeId to be provided as a reference string
    if (!attendeeId) {
        const existing = await getAttendee(reference);
        if (existing) {
            reference = existing.reference;
            attendeeId = existing.attendeeId;
        }
    }
    if (!attendeeId) {
        attendeeId = createAttendeeId();
    }
    const existing = await getAttendee(attendeeId);
    if (existing && !isDifferent(existing)) {
        return existing;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const createdByPartnerId = getMaybePartner()?.partnerId;
    const createdByUserId = getMaybeUser()?.userId;
    const attendee: Attendee = {
        ...existing,
        ...data,
        reference,
        attendeeId,
        createdAt,
        createdByPartnerId,
        createdByUserId
    };
    await store.set(attendeeId, attendee);
    return attendee;

    function isDifferent(value: Attendee) {
        return !!entries(data).find(entry => value[entry[0]] !== entry[1]);
    }

    function createAttendeeId() {
        if (ATTENDEE_DISABLE_PARTITION) {
            return data.reference;
        }
        const hash = createHash("sha512");
        hash.update(getPartitionPrefix());
        hash.update(data.reference);
        return hash.digest().toString("hex");
    }
}