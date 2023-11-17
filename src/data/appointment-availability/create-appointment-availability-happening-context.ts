import {createGetHappeningTreeContext, CreateGetHappeningTreeContextOptions} from "../happening";
import {AppointmentAvailability} from "./types";
import {getAppointmentAvailability} from "./get-appointment-availability";

export function createAppointmentHappeningTreeContext(options?: CreateGetHappeningTreeContextOptions<AppointmentAvailability, "appointmentAvailabilityId">) {
    return createGetHappeningTreeContext<AppointmentAvailability, "appointmentAvailabilityId">({
        get: getAppointmentAvailability,
        ...options,
        idKey: "appointmentAvailabilityId",
    });
}