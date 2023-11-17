import {createGetHappeningTreeContext, CreateGetHappeningTreeContextOptions} from "../happening";
import {Appointment} from "./types";
import {getAppointment} from "./get-appointment";

export function createAppointmentHappeningTreeContext(options?: CreateGetHappeningTreeContextOptions<Appointment, "appointmentId">) {
    return createGetHappeningTreeContext<Appointment, "appointmentId">({
        get: getAppointment,
        ...options,
        idKey: "appointmentId",
    });
}