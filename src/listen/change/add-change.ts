import {FastifyInstance} from "fastify";
import { addChange, ChangeData, changeSchema } from "../../data";
import { authenticate } from "../authentication";
import {ChangeTargetParams} from "./types";
import {ok} from "../../is";

export async function addChangeRoutes(fastify: FastifyInstance) {

  interface Params extends ChangeTargetParams {
    targetId: string;
  }

  type Schema = {
    Params: Params;
    Body: Omit<ChangeData, "target" | "type">;
  };

  const params = {
    type: "object",
    properties: {
      changeType: {
        type: "string",
      },
      targetType: {
        type: "string",
      },
      targetId: {
        type: "string",
      },
    },
    required: ["changeType", "targetType", "targetId"],
  };

  const response = {
    201: {
      description: "A new change",
      ...changeSchema.change,
    },
  };

  const schema = {
    description: "Add a new change",
    tags: ["change"],
    summary: "",
    body: changeSchema.changeData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.post<Schema>("/:targetId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const change = await addChange({
          ...request.body,
          type: request.params.changeType,
          target: {
            type: request.params.targetType,
            id: request.params.targetId
          }
        });
        response.status(201);
        response.send(change);
      },
    });
  } catch {}
}
