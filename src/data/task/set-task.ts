import { Task, TaskData } from "./types";
import { getTaskStore } from "./store";
import {v4} from "uuid";

export async function setTask(
  data: TaskData & Partial<Task>
): Promise<Task> {
  const store = await getTaskStore();
  const updatedAt = new Date().toISOString();
  const taskId = data.taskId || v4();
  const document: Task = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    taskId,
    updatedAt,
  };
  await store.set(data.taskId, document);
  return document;
}