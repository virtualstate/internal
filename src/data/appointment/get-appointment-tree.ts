import {getHappeningTree, HappeningTree} from "../happening";
import {createAppointmentHappeningTreeContext} from "./create-appointment-happening-context";
import {Appointment} from "./types";
import {getAppointment} from "./get-appointment";
import {ok} from "../../is";
import {getLocation, Location} from "../location";
import {getConfig} from "../../config";

export interface AppointmentTreeConfig {
    getAppointmentTree?(appointmentId: string): Promise<AppointmentTree | undefined>
}

export interface AppointmentTree extends HappeningTree, Pick<Appointment, "status" | "statusAt" | "history"> {
    location?: Location;
    appointment?: Appointment;
    updatedAt: string;
    createdAt: string;
}

export async function getAppointmentTree(appointmentId: string): Promise<AppointmentTree> {
    const config = getConfig();
    if (config.getAppointmentTree) {
        const tree = await config.getAppointmentTree(appointmentId);
        ok(tree, "Could not find appointment");
        return tree;
    }
    const appointment = await getAppointment(appointmentId);
    ok(appointment, "Could not find appointment");
    const context = createAppointmentHappeningTreeContext({
        happenings: [
            appointment
        ]
    });
    const tree = await getHappeningTree(appointmentId, context);
    const { status, statusAt, history} = appointment;
    const location = appointment.locationId ? await getLocation(appointment.locationId) : undefined;
    return {
        ...tree,
        appointment,
        status,
        statusAt,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        history,
        location,
    }
}