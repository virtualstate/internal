import {FastifyInstance} from "fastify";
import {getTask, TaskData, taskSchema, setTask} from "../../data";
import { authenticate } from "../authentication";

export async function patchTaskRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<TaskData>;
    Params: {
      taskId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      taskId: {
        type: "string",
      },
    },
    required: ["taskId"],
  };

  const response = {
    201: {
      description: "Updated task",
      ...taskSchema.task,
    },
  };

  const schema = {
    description: "Update an existing task",
    tags: ["task"],
    summary: "",
    body: {
      ...taskSchema.taskData,
      properties: Object.fromEntries(
        Object.entries(taskSchema.taskData.properties)
            .map(([key, value]) => {
              if (typeof value !== "object" || Array.isArray(value)) return [key, value];
              return [key, {
                ...value,
                nullable: true
              }]
            })
      ),
      required: [] as string[]
    },
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.patch<Schema>("/:taskId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { taskId } = request.params;
        const existing = await getTask(taskId);
        // Patch must have an existing task
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const task = await setTask({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          taskId
        });
        response.status(200);
        response.send(task);
      },
    });
  } catch {
  }
}
