export type PaymentMethodType =
    | "invoice"
    | "realtime";

export type PaymentMethodStatus = "pending" | "available" | "expired" | "void";

export interface PaymentMethodData extends Record<string, unknown> {
  status: PaymentMethodStatus;
  type: PaymentMethodType;
  userId?: string;
  organisationId?: string;
}

export interface PaymentMethod extends PaymentMethodData {
  paymentMethodId: string;
  createdAt: string;
  updatedAt: string;
}
