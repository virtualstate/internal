export const paymentMethodType = {
  type: "string"
}

export const paymentMethodStatus = {
  type: "string",
  enum: [
      "pending",
      "available",
      "expired",
      "void"
  ]
}

export const paymentMethodData = {
  type: "object",
  properties: {
    type: paymentMethodType,
    status: paymentMethodStatus,
    currency: {
      type: "string",
      nullable: true
    }
  },
  required: ["type", "status"],
} as const;

export const paymentMethod = {
  type: "object",
  properties: {
    ...paymentMethodData.properties,
    paymentMethodId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
  },
  required: ["paymentMethodId", "createdAt", "updatedAt", ...paymentMethodData.required],
} as const;
