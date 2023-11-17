import {getChange} from "./get-change";
import {Change, ChangeIdentifier} from "./types";
import {getConfig} from "../../config";
import {setChange} from "./set-change";
import {AppointmentData, getAppointment, setAppointment} from "../appointment";
import {getTask, setTask, TaskData} from "../task";

export interface ProcessChangeConfig {
    change?(change: Change): Promise<boolean>
}

type AppointmentChange = Change & { data: AppointmentData };
type TaskChange = Change & { data: TaskData };

export async function change(identifier: ChangeIdentifier) {
    const change = await getChange(identifier);
    if (!change) return false;

    let applied = false;
    
    if (change.status !== "applied") {
        applied = await apply();

        if (applied) {
            await setChange({
                ...change,
                status: "applied",
                appliedAt: new Date().toISOString()
            });
        }
    }


    return applied;

    async function apply() {
        const config = getConfig()
        if (config.change) {
            try {
                if (await config.change(change)) {
                    return true;
                }
            } catch {
                // Allows for change to be cancelled
                return false;
            }
        }

        return applyDefault();
    }

    async function applyDefault() {
        if (isAppointmentChange(change)) {
            return applyAppointmentChange(change);
        }
        if (isTaskChange(change)) {
            return applyTaskChange(change);
        }
        return false;

        function isAppointmentChange(change: Change): change is AppointmentChange {
            return change.target.type === "appointment" && !!change.data;
        }

        function isTaskChange(change: Change): change is TaskChange {
            return change.target.type === "task" && !!change.data;
        }
    }

    async function applyAppointmentChange(change: AppointmentChange) {
        if (change.status === "pending" && change.type === "request") {
            const appointment = await getAppointment(change.target.id);
            if (!appointment) return false;
            await setAppointment({
                ...appointment,
                ...change.data,
                appointmentId: appointment.appointmentId
            });
            return true;
        }
        return false;
    }

    async function applyTaskChange(change: TaskChange) {
        if (change.status === "pending" && change.type === "request") {
            const task = await getTask(change.target.id);
            if (!task) return false;
            await setTask({
                ...task,
                ...change.data,
                taskId: task.taskId
            });
            return true;
        }
        return false;
    }
}