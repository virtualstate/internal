import { getKeyValueStore } from "../kv";
import { Task } from "./types";
import {getHappeningStore} from "../happening";

const STORE_NAME = "task" as const;

export function getTaskStore() {
  return getHappeningStore<Task>(STORE_NAME, {
    counter: true
  });
}
