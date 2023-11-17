import {getHappeningTree, HappeningTree} from "../happening";
import {createAppointmentHappeningTreeContext} from "./create-appointment-availability-happening-context";
import {AppointmentAvailability} from "./types";
import {getAppointmentAvailability} from "./get-appointment-availability";
import {ok} from "../../is";
import {getLocation, Location} from "../location";
import {getConfig} from "../../config";

export interface AppointmentAvailabilityTreeConfig {
    getAppointmentAvailabilityTree?(appointmentId: string): Promise<AppointmentAvailabilityTree | undefined>
}

export interface AppointmentAvailabilityTree extends HappeningTree, Pick<AppointmentAvailability, "status" | "statusAt" | "history"> {
    location?: Location;
    appointmentAvailability?: AppointmentAvailability;
    updatedAt: string;
    createdAt: string;
}

export async function getAppointmentAvailabilityTree(appointmentId: string): Promise<AppointmentAvailabilityTree> {
    const config = getConfig();
    if (config.getAppointmentTree) {
        const tree = await config.getAppointmentTree(appointmentId);
        ok(tree, "Could not find appointment");
        return tree;
    }
    const appointmentAvailability = await getAppointmentAvailability(appointmentId);
    ok(appointmentAvailability, "Could not find appointment availability");
    const context = createAppointmentHappeningTreeContext({
        happenings: [
            appointmentAvailability
        ]
    });
    const tree = await getHappeningTree(appointmentId, context);
    const { status, statusAt, history} = appointmentAvailability;
    const location = appointmentAvailability.locationId ? await getLocation(appointmentAvailability.locationId) : undefined;
    return {
        ...tree,
        appointmentAvailability,
        status,
        statusAt,
        createdAt: appointmentAvailability.createdAt,
        updatedAt: appointmentAvailability.updatedAt,
        history,
        location,
    }
}