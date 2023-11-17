import {ShipmentTo} from "../shipment";

export type PaymentMethodType =
    | "invoice"
    | "realtime"
    | string;

export type PaymentMethodStatus = "pending" | "available" | "expired" | "void";


export interface PaymentMethodOwnerIdentifiers {
  userId?: string;
  organisationId?: string;
}

export interface PaymentMethodIdentifier extends PaymentMethodOwnerIdentifiers {
  paymentMethodId: string;
}

export interface PaymentMethodData extends Record<string, unknown>, PaymentMethodOwnerIdentifiers {
  status: PaymentMethodStatus;
  type: PaymentMethodType;
  currency?: string;
  paymentMethodName?: string;
  issuerName?: string;
  issuerId?: string;
  issuerPaymentMethodId?: string;
  to?: ShipmentTo;
}

export interface PaymentMethod extends PaymentMethodData, PaymentMethodIdentifier {
  createdAt: string;
  updatedAt: string;
}
