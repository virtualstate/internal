import {ShipmentFrom, ShipmentTo} from "../shipment";
import {Amount} from "../payment";

export type PaymentRequestType =
    | "invoice"
    | "realtime"
    | string;

export type PaymentRequestStatus = "pending" | "accepted" | "expired" | "void";

export interface PaymentRequestOwnerIdentifiers {
  userId?: string;
  organisationId?: string;
}

export interface PaymentRequestIdentifier extends PaymentRequestOwnerIdentifiers {
  paymentRequestId: string;
}

export interface PaymentRequestData extends Record<string, unknown>, PaymentRequestOwnerIdentifiers {
  status?: PaymentRequestStatus;
  types?: PaymentRequestType[];
  paymentMethodId?: string;
  to?: ShipmentTo;
  from?: ShipmentFrom;
  totalAmount?: Amount;
}

export interface PaymentRequest extends PaymentRequestData, PaymentRequestIdentifier {
  status: PaymentRequestStatus;
  types: PaymentRequestType[];
  createdAt: string;
  updatedAt: string;
}
