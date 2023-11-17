import {HappeningData} from "../happening";

export type TaskType =
    | "inventory"
    | "packing"
    | "picking"
    | "order"
    | "product"
    | "offer"

export interface TaskData extends HappeningData {
  type: TaskType
  title: string;
  organisationId?: string;
  attendees: string[];
}

export interface Task extends TaskData {
  taskId: string;
  createdAt: string;
  updatedAt: string;
}
