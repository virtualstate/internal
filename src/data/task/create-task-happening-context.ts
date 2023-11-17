import {createGetHappeningTreeContext, CreateGetHappeningTreeContextOptions} from "../happening";
import {Task} from "./types";
import {getTask} from "./get-task";

export function createTaskHappeningTreeContext(options?: CreateGetHappeningTreeContextOptions<Task, "taskId">) {
    return createGetHappeningTreeContext<Task, "taskId">({
        get: getTask,
        ...options,
        idKey: "taskId",
    });
}