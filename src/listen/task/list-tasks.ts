import { FastifyInstance, FastifyRequest } from "fastify";
import { listTasks, taskSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listTaskRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: taskSchema.task,
    },
  };

  const schema = {
    description: "List of tasks",
    tags: ["task"],
    summary: "",
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.get("/", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request: FastifyRequest, response) {
        response.send(await listTasks({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
