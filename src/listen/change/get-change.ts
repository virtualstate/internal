import {FastifyInstance} from "fastify";
import { getChange, changeSchema } from "../../data";
import { authenticate } from "../authentication";
import {ChangeTargetParams} from "./types";

export async function getChangeRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      changeId: {
        type: "string",
      },
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
    required: ["changeId", "changeType", "targetType", "targetId"],
  };

  const response = {
    200: {
      description: "A change",
      ...changeSchema.change,
    },
  };

  const schema = {
    description: "Get a change",
    tags: ["change"],
    summary: "",
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  interface Params extends ChangeTargetParams {
    changeId: string;
    targetId: string;
  }

  type Schema = {
    Params: Params;
  };

  try {
    fastify.get<Schema>("/:targetId/:changeId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const change = await getChange({
          type: request.params.changeType,
          changeId: request.params.changeId,
          target: {
            type: request.params.targetType
          }
        });
        if (!change || change.target.id !== request.params.targetId) response.status(404);
        response.send(change);
      },
    });
  } catch {}
}
