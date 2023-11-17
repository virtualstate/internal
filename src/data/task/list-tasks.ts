import { Task } from "./types";
import { getTaskStore } from "./store";

export interface ListTasksInput {}

export async function listTasks({}: ListTasksInput = {}): Promise<
  Task[]
> {
  const store = getTaskStore();
  return store.values();
}
