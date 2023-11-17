import {FastifyInstance} from "fastify";
import {getProduct, ProductData, productSchema, setProduct} from "../../data";
import { authenticate } from "../authentication";

export async function patchProductRoutes(fastify: FastifyInstance) {
  type Schema = {
    Body: Partial<ProductData>;
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
    201: {
      description: "Updated product",
      ...productSchema.product,
    },
  };

  const schema = {
    description: "Update an existing product",
    tags: ["product"],
    summary: "",
    body: {
      ...productSchema.productData,
      properties: Object.fromEntries(
        Object.entries(productSchema.productData.properties)
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
    fastify.patch<Schema>("/:productId", {
      schema,
      preHandler: authenticate(fastify),
      async handler(request, response) {
        const { productId } = request.params;
        const existing = await getProduct(productId);
        // Patch must have an existing product
        if (!existing) {
          response.status(404);
          return response.send();
        }
        const product = await setProduct({
          ...existing,
          ...request.body,
          createdAt: existing.createdAt,
          productId
        });
        response.status(200);
        response.send(product);
      },
    });
  } catch {
  }
}
