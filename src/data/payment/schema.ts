export const paymentAmount = {
  type: "object",
  properties: {
    amount: {
      type: "string"
    },
    currency: {
      type: "string"
    }
  },
  required: [
      "amount",
      "currency"
  ]
}

export const paymentType = {
  type: "string"
}

export const paymentStatus = {
  type: "string"
}

export const paymentData = {
  type: "object",
  properties: {
    type: paymentType,
    status: paymentStatus,
    reference: {
      type: "string",
      nullable: true
    },
    totalAmount: {
      ...paymentAmount,
      nullable: true
    },
    paymentRequestId: {
      type: "string",
      nullable: true
    },
    paymentMethodId: {
      type: "string"
    },
    userId: {
      type: "string",
      nullable: true
    },
    organisationId: {
      type: "string",
      nullable: true
    }
  },
  required: ["type", "status", "paymentMethodId"],
} as const;

export const payment = {
  type: "object",
  properties: {
    paymentId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...paymentData.properties,
  },
  required: ["paymentId", "createdAt", "updatedAt", ...paymentData.required],
} as const;
