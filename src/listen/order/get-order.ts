import {FastifyInstance} from "fastify";
import {getOrder, getUserPendingOrder, orderSchema} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser, getUser, isUnauthenticated} from "../../authentication";
import {ok} from "../../is";

export async function getOrderRoutes(fastify: FastifyInstance) {
  const params = {
    type: "object",
    properties: {
      orderId: {
        type: "string",
      },
    },
    required: ["orderId"],
  };

  const response = {
    200: {
      description: "A order",
      ...orderSchema.order,
    },
  };


  try {
    const schema = {
      description: "Get a order",
      tags: ["order"],
      summary: "",
      response,
      security: [
        {
          apiKey: [] as string[],
        },
      ],
    };

    fastify.get("/pending", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const order = await getUserPendingOrder(getUser().userId)
        ok(order, "Expected pending order to be always available");
        response.send(order);
      },
    });
  } catch {}


  try {

    const schema = {
      description: "Get a order",
      tags: ["order"],
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
        orderId: string;
      };
    };

    fastify.get<Schema>("/:orderId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const order = await getOrder(request.params.orderId, {
          userId: getMaybeUser()?.userId,
          organisationId: getMaybePartner()?.organisationId
        });
        if (!order) response.status(404);
        response.send(order);
      },
    });
  } catch {}
}
