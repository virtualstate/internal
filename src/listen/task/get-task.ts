import {FastifyInstance} from "fastify";
import { getTask, taskSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function getTaskRoutes(fastify: FastifyInstance) {
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
      description: "A task",
      ...taskSchema.task,
    },
  };

  const schema = {
    description: "Get a task",
    tags: ["task"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  type Schema = {
    Params: {
      taskId: string;
    };
  };

  try {
    fastify.get<Schema>("/:taskId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const task = await getTask(request.params.taskId);
        if (!task || (isUnauthenticated() || !task.public)) response.status(404);
        response.send(task);
      },
    });
  } catch {}
}
