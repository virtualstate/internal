import { FastifyInstance, FastifyRequest } from "fastify";
import { listChanges, changeSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";
import {ChangeTargetParams} from "./types";

export async function listChangeRoutes(fastify: FastifyInstance) {
  const response = {
    200: {
      type: "array",
      items: changeSchema.change,
    },
  };

  const baseSchema = {
    description: "List of changes",
    tags: ["change"],
    summary: "",
    response,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  const baseParams = {
    type: "object",
    properties: {
      changeType: {
        type: "string",
      },
      targetType: {
        type: "string",
      },
    },
    required: ["changeType", "targetType"],
  };

  try {

    const params = baseParams

    const schema = {
      ...baseSchema,
      params
    };

    type Schema = {
      Params: ChangeTargetParams
    }

    fastify.get<Schema>("/", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request, response) {
        response.send(
            await listChanges({
              type: request.params.changeType,
              target: {
                type: request.params.targetType
              }
            })
        );
      },
    });
  } catch { }
  try {

    const params = {
      ...baseParams,
      properties: {
        ...baseParams.properties
      },
      required: [
        ...baseParams.required
      ]
    }

    const schema = {
      ...baseSchema,
      params
    };

    interface Params extends ChangeTargetParams {
      targetId: string;
    }

    type Schema = {
      Params: Params
    }

    fastify.get<Schema>("/:targetId", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request, response) {
        const changes = await listChanges({
          type: request.params.changeType,
          target: {
            type: request.params.targetType,
            id: request.params.targetId
          }
        });
        response.send(changes);
      },
    });
  } catch { }
}
