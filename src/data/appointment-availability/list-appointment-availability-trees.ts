import {ListHappeningTreesInput, listHappeningTreesWithContext} from "../happening";
import {AppointmentAvailability} from "./types";
import {createAppointmentHappeningTreeContext} from "./create-appointment-availability-happening-context";
import {listAppointmentAvailability, ListAppointmentAvailabilityInput} from "./list-appointment-availability";
import {getAttendee} from "../attendee";

export interface ListAppointmentAvailabilityTreesOptions extends ListHappeningTreesInput<AppointmentAvailability, "appointmentAvailabilityId">, ListAppointmentAvailabilityInput {

}

export async function listAppointmentAvailabilityTrees(options: ListAppointmentAvailabilityTreesOptions) {
    const availabilities = await listAppointmentAvailability(options);
    const attendeeIds = [...new Set(availabilities.flatMap(availability => availability.attendees))];
    const attendees = await Promise.all(attendeeIds.map(getAttendee));
    const context = createAppointmentHappeningTreeContext({
        happenings: availabilities,
        attendees
    })
    return listHappeningTreesWithContext(context);
}