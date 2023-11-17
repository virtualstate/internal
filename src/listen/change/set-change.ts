import {FastifyInstance} from "fastify";
import {getChange, ChangeData, changeSchema, setChange} from "../../data";
import { authenticate } from "../authentication";
import {ChangeTargetParams} from "./types";

export async function setChangeRoutes(fastify: FastifyInstance) {

  interface Params extends ChangeTargetParams {
    changeId: string;
    targetId: string;
  }

  type Schema = {
    Body: Omit<ChangeData, "type" | "target">;
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
    200: {
      description: "Updated change",
      ...changeSchema.change,
    },
  };

  const schema = {
    description: "Update an existing change",
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
    fastify.put<Schema>("/:targetId/:changeId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const existing = await getChange({
          type: request.params.changeType,
          changeId: request.params.changeId,
          target: {
            type: request.params.targetType
          }
        });
        if (existing && existing.target.id !== request.params.targetId) {
          response.status(404);
          return response.send();
        }
        const change = await setChange({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          changeId: request.params.changeId,
          type: request.params.changeType,
          target: {
            type: request.params.targetType,
            id: request.params.targetId
          }
        });
        response.status(200);
        response.send(change);
      },
    });
  } catch {}
}
