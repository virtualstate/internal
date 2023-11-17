import { v4 } from "uuid";
import { TaskData, Task } from "./types";
import { setTask } from "./set-task";

export async function addTask(data: TaskData): Promise<Task> {
  const taskId = v4();
  return setTask({
    ...data,
    taskId,
  });
}
