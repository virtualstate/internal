import { identifierSchema } from "../identifier";

export const inventoryProduct = {
  type: "object",
  properties: {
    productId: {
      type: "string"
    },
    quantity: {
      type: "number"
    },
    identifiers: {
      type: "array",
      items: identifierSchema.identifier
    }
  },
  required: ["productId", "quantity", "identifiers"]
}

export const inventoryData = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: inventoryProduct,
      nullable: true
    },
    locationId: {
      type: "string",
      nullable: true
    }
  },
  required: [

  ],
} as const;

export const inventory = {
  type: "object",
  properties: {
    inventoryId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...inventoryData.properties,
  },
  required: ["inventoryId", "createdAt", "updatedAt", ...inventoryData.required],
} as const;
