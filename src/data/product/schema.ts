export const productData = {
  type: "object",
  properties: {
    productName: {
      type: "string",
    },
    organisationText: {
      type: "string",
      nullable: true
    },
    organisationName: {
      type: "string",
      nullable: true
    },
    organisationId: {
      type: "string",
      nullable: true
    },
    generic: {
      type: "boolean",
      nullable: true,
    },
    public: {
      type: "boolean",
      nullable: true,
    },
  },
  required: ["productName"],
} as const;

export const product = {
  type: "object",
  properties: {
    productId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...productData.properties,
  },
  required: ["productId", "createdAt", "updatedAt", ...productData.required],
} as const;
