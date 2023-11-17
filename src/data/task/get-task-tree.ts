import {getHappeningTree} from "../happening";
import {createTaskHappeningTreeContext} from "./create-task-happening-context";

export async function getTaskTree(taskId: string) {
    return getHappeningTree(taskId, createTaskHappeningTreeContext());
}