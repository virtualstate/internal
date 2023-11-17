import { getTaskStore } from "./store";

export function getTask(id: string) {
  const store = getTaskStore();
  return store.get(id);
}
