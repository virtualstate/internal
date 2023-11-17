import {FastifyInstance} from "fastify";
import { addTask, TaskData, taskSchema } from "../../data";
import { authenticate } from "../authentication";

export async function addTaskRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: TaskData;
  };

  const response = {
    201: {
      description: "A new task",
      ...taskSchema.task,
    },
  };

  const schema = {
    description: "Add a new task",
    tags: ["task"],
    summary: "",
    body: taskSchema.taskData,
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.post<Schema>("/", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const task = await addTask(request.body);
        response.status(201);
        response.send(task);
      },
    });
  } catch {}
}
