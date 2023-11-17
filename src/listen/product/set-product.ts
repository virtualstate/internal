import {FastifyInstance} from "fastify";
import {getProduct, ProductData, productSchema, setProduct} from "../../data";
import { authenticate } from "../authentication";

export async function setProductRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: ProductData;
    Params: {
      productId: string;
    }
  };

  const params = {
    type: "object",
    properties: {
      productId: {
        type: "string",
      },
    },
    required: ["productId"],
  };

  const response = {
    200: {
      description: "Updated product",
      ...productSchema.product,
    },
  };

  const schema = {
    description: "Update an existing product",
    tags: ["product"],
    summary: "",
    body: productSchema.productData,
    response,
    params,
    security: [
      {
        apiKey: [] as string[],
      },
    ],
  };

  try {
    fastify.put<Schema>("/:productId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { productId } = request.params;
        const existing = await getProduct(productId);
        const product = await setProduct({
          // Completely replace excluding created at
          // createdAt must come from the server
          ...request.body,
          createdAt: existing?.createdAt,
          productId
        });
        response.status(200);
        response.send(product);
      },
    });
  } catch {}
}
