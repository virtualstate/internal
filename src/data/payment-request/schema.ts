import {shipmentFrom, shipmentTo} from "../shipment/schema";
import {paymentAmount} from "../payment/schema";

export const paymentRequestType = {
  type: "string"
}

export const paymentRequestStatus = {
  type: "string",
  enum: [
      "pending",
      "accepted",
      "expired",
      "void"
  ]
}

export const paymentRequestData = {
  type: "object",
  properties: {
    type: {
      type: "array",
      items: paymentRequestType,
      nullable: true
    },
    status: {
      ...paymentRequestStatus,
      nullable: true
    },
    from: {
      ...shipmentFrom,
      nullable: true
    },
    to: {
      ...shipmentTo,
      nullable: true
    },
    totalAmount: {
      ...paymentAmount,
      nullable: true
    }
  }
} as const;

export const paymentRequest = {
  type: "object",
  properties: {
    ...paymentRequestData.properties,
    type: {
      type: "array",
      items: paymentRequestType
    },
    status: paymentRequestStatus,
    paymentRequestId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
  },
  required: ["type", "paymentRequestId", "createdAt", "updatedAt", "status"],
} as const;
