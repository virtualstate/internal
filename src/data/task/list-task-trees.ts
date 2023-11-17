import {listHappenings, listHappeningTrees, ListHappeningTreesInput, listHappeningTreesWithContext} from "../happening";
import {Task} from "./types";
import {createTaskHappeningTreeContext} from "./create-task-happening-context";
import {listTasks, ListTasksInput} from "./list-tasks";
import {getAttendee} from "../attendee";

export interface ListTaskTreesOptions extends ListHappeningTreesInput<Task, "taskId">, ListTasksInput {

}

export async function listTaskTrees(options: ListTaskTreesOptions) {
    const tasks = await listTasks(options);
    const attendeeIds = [...new Set(tasks.flatMap(task => task.attendees))];
    const attendees = await Promise.all(attendeeIds.map(getAttendee));

    const context = createTaskHappeningTreeContext({
        happenings: tasks,
        attendees
    })
    return listHappeningTreesWithContext(context);
}