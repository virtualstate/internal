import {identifierSchema} from "../identifier";
import {happeningSchema} from "../happening";

export const taskData = {
  type: "object",
  properties: {
    ...happeningSchema.happeningData.properties,
    title: {
      type: "string",
    },
    identifiers: {
      type: "array",
      items: identifierSchema.identifier
    }
  },
  required: ["identifiers", "title"],
} as const;

export const task = {
  type: "object",
  properties: {
    taskId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...taskData.properties,
  },
  required: ["taskId", "createdAt", "updatedAt", ...taskData.required],
} as const;
