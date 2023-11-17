import { identifierSchema } from "../identifier";

export const inventoryItem = {
  type: "object",
  properties: {
    itemId: {
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
  required: ["itemId", "quantity", "identifiers"]
}