import {listHappenings, listHappeningTrees, ListHappeningTreesInput, listHappeningTreesWithContext} from "../happening";
import {Appointment} from "./types";
import {createAppointmentHappeningTreeContext} from "./create-appointment-happening-context";
import {listAppointments, ListAppointmentsInput} from "./list-appointments";
import {getAttendee} from "../attendee";

export interface ListAppointmentTreesOptions extends ListHappeningTreesInput<Appointment, "appointmentId">, ListAppointmentsInput {

}

export async function listAppointmentTrees(options: ListAppointmentTreesOptions) {
    const appointments = await listAppointments(options);
    const attendeeIds = [...new Set(appointments.flatMap(appointment => appointment.attendees))];
    const attendees = await Promise.all(attendeeIds.map(getAttendee));

    const context = createAppointmentHappeningTreeContext({
        happenings: appointments,
        attendees
    })
    return listHappeningTreesWithContext(context);
}