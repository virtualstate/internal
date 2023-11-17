import {FastifyInstance} from "fastify";
import {getTask, TaskData, taskSchema, setTask} from "../../data";
import { authenticate } from "../authentication";

export async function setTaskRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: TaskData;
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
    200: {
      description: "Updated task",
      ...taskSchema.task,
    },
  };

  const schema = {
    description: "Update an existing task",
    tags: ["task"],
    summary: "",
    body: taskSchema.taskData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:taskId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { taskId } = request.params;
        const existing = await getTask(taskId);
        const task = await setTask({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          taskId
        });
        response.status(200);
        response.send(task);
      },
    });
  } catch {}
}
