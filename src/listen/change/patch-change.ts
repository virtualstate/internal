import {FastifyInstance} from "fastify";
import {getChange, ChangeData, changeSchema, setChange} from "../../data";
import { authenticate } from "../authentication";
import {ChangeTargetParams} from "./types";

export async function patchChangeRoutes(fastify: FastifyInstance) {

  interface Params extends ChangeTargetParams {
    changeId: string;
    targetId: string;
  }

  type Schema = {
    Body: Partial<ChangeData>;
    Params: Params
  };

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
    201: {
      description: "Updated change",
      ...changeSchema.change,
    },
  };

  const schema = {
    description: "Update an existing change",
    tags: ["change"],
    summary: "",
    body: {
      ...changeSchema.changeData,
      properties: Object.fromEntries(
        Object.entries(changeSchema.changeData.properties)
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
    fastify.patch<Schema>("/:changeId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const existing = await getChange({
          type: request.params.changeType,
          changeId: request.params.changeId,
          target: {
            type: request.params.targetType,
          }
        });
        // Patch must have an existing change
        if (!existing || existing.target.id !== request.params.targetId) {
          response.status(404);
          return response.send();
        }
        const change = await setChange({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          type: request.params.changeType,
          changeId: request.params.changeId,
          target: {
            ...existing.target,
            type: request.params.targetType,
            id: request.params.targetId,
          }
        });
        response.status(200);
        response.send(change);
      },
    });
  } catch {
  }
}
