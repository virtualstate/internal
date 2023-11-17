import { FastifyInstance, FastifyRequest } from "fastify";
import { listProducts, productSchema } from "../../data";
import { authenticate } from "../authentication";
import {isUnauthenticated} from "../../authentication";

export async function listProductRoutes(fastify: FastifyInstance) {
  const {
    PUBLIC_PRODUCTS
  } = process.env;
  const response = {
    200: {
      type: "array",
      items: productSchema.product,
    },
  };

  const schema = {
    description: "List of products",
    tags: ["product"],
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
      preHandler: authenticate(fastify, { anonymous: !!PUBLIC_PRODUCTS }),
      async handler(request: FastifyRequest, response) {
        response.send(await listProducts({
          public: isUnauthenticated()
        }));
      },
    });
  } catch { }
}
