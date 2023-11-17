import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
  addOrderItem,
  getOffer,
  getOrder,
  getOrderItem,
  getProduct,
  deleteOrderItem,
  OrderItemData,
  orderItemSchema,
  listOrderItems, listOrderProducts, getService, listOrderServices, deleteOrderItems
} from "../../data";
import { authenticate } from "../authentication";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function deleteOrderItemRoutes(fastify: FastifyInstance) {

  type Querystring = {
    redirect?: string;
  }

  type OrderParams = {
    orderId: string
  }

  try {

    type Params = OrderParams & {
      orderItemId: string;
    }

    type Schema = {
      Querystring: Querystring
      Params: Params
    };

    const params = {
      type: "object",
      properties: {
        orderId: {
          type: "string"
        },
        orderItemId: {
          type: "string"
        }
      },
      required: ["orderId", "orderItemId"]
    };

    const schema = {
      description: "Delete an order item",
      tags: ["order item"],
      summary: "",
      params,
      security: [
        {
          apiKey: [] as string[],
        },
      ],
    };
    async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
      const order = await getOrder(request.params.orderId, {
        userId: getMaybeUser()?.userId,
        organisationId: getMaybePartner()?.organisationId
      });
      if (!order) {
        response.status(404);
        response.send();
        return;
      }
      const orderItem = await getOrderItem(request.params.orderId, request.params.orderItemId);
      if (!order) {
        response.status(404);
        response.send();
        return;
      }
      await deleteOrderItem(request.params.orderId, request.params.orderItemId);
      const { redirect } = request.query;
      if (redirect) {
        const url = redirect.replace(":orderId", orderItem.orderId);
        response.header("Location", url);
        response.status(302);
        response.send();
        return;
      }
      response.status(204);
      response.send();
    }

    fastify.delete<Schema>("/:orderItemId", {
      schema,
      preHandler: authenticate(fastify),
      handler,
    });
  } catch {}

  try {
    type Params = OrderParams & {
      offerId: string;
    }

    type Schema = {
      Querystring: Querystring
      Params: Params
      Body: OrderItemData;
    };

    const params = {
      type: "object",
      properties: {
        orderId: {
          type: "string"
        },
        offerId: {
          type: "string"
        }
      },
      required: ["orderId", "offerId"]
    };

    const schema = {
      description: "Delete an order item",
      tags: ["order item"],
      summary: "",
      params,
      security: [
        {
          apiKey: [] as string[],
        },
      ],
    };

    async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
      const order = await getOrder(request.params.orderId, {
        userId: getMaybeUser()?.userId,
        organisationId: getMaybePartner()?.organisationId
      });
      if (!order) {
        response.status(404);
        response.send();
        return;
      }

      const items = await listOrderItems(order.orderId);
      const matching = items.filter(item => item.offerId === request.params.offerId);
      await deleteOrderItems(matching);

      const { redirect } = request.query;
      if (redirect) {
        const url = redirect.replace(":orderId", order.orderId);
        response.header("Location", url);
        response.status(302);
        response.send();
        return;
      }
      response.status(204);
      response.send();
    }

    fastify.delete<Schema>("/offers/:offerId", {
      schema,
      preHandler: authenticate(fastify),
      handler,
    });
    fastify.get<Schema>("/offers/:offerId/delete", {
      schema,
      preHandler: authenticate(fastify),
      handler,
    });
  } catch {}


  try {
    type Params = OrderParams & {
      productId: string;
    }

    type Schema = {
      Querystring: Querystring;
      Params: Params;
    };

    const params = {
      type: "object",
      properties: {
        orderId: {
          type: "string"
        },
        productId: {
          type: "string"
        }
      },
      required: ["orderId", "productId"]
    };

    const schema = {
      description: "Deletes an order item",
      tags: ["order item"],
      summary: "",
      params,
      security: [
        {
          apiKey: [] as string[],
        },
      ],
    };

    async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
      const order = await getOrder(request.params.orderId, {
        userId: getMaybeUser()?.userId,
        organisationId: getMaybePartner()?.organisationId
      });
      if (!order) {
        response.status(404);
        response.send();
        return;
      }
      const product = await getProduct(request.params.productId)
      if (!product) {
        response.status(404);
        response.send();
        return;
      }

      const products = await listOrderProducts(order.orderId, true);
      const matching = products.filter(item => item.productId === request.params.productId);
      await deleteOrderItems(matching);

      const { redirect } = request.query;
      if (redirect) {
        const url = redirect.replace(":orderId", order.orderId);
        response.header("Location", url);
        response.status(302);
        response.send();
        return;
      }
      response.status(204);
      response.send();
    }

    fastify.delete<Schema>("/products/:productId", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
    fastify.get<Schema>("/products/:productId/delete", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {
  }


  try {
    type Params = OrderParams & {
      serviceId: string;
    }

    type Schema = {
      Querystring: Querystring;
      Params: Params;
    };

    const params = {
      type: "object",
      properties: {
        orderId: {
          type: "string"
        },
        serviceId: {
          type: "string"
        }
      },
      required: ["orderId", "serviceId"]
    };

    const schema = {
      description: "Deletes an order item",
      tags: ["order item"],
      summary: "",
      params,
      security: [
        {
          apiKey: [] as string[],
        },
      ],
    };

    async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
      const order = await getOrder(request.params.orderId, {
        userId: getMaybeUser()?.userId,
        organisationId: getMaybePartner()?.organisationId
      });
      if (!order) {
        response.status(404);
        response.send();
        return;
      }
      const service = await getService(request.params.serviceId)
      if (!service) {
        response.status(404);
        response.send();
        return;
      }

      const services = await listOrderServices(order.orderId, true);
      const matching = services.filter(item => item.serviceId === request.params.serviceId);
      await deleteOrderItems(matching);

      const { redirect } = request.query;
      if (redirect) {
        const url = redirect.replace(":orderId", order.orderId);
        response.header("Location", url);
        response.status(302);
        response.send();
        return;
      }
      response.status(204);
      response.send();
    }

    fastify.delete<Schema>("/services/:serviceId", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
    fastify.get<Schema>("/services/:serviceId/delete", {
      schema,
      preHandler: authenticate(fastify),
      handler
    });
  } catch {
  }
}
