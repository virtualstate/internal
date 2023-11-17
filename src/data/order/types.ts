import type {OrderItem, OrderProductItem, OrderServiceItem} from "../order-item";
import type {ShipmentFrom, ShipmentTo} from "../shipment";
import type {PaymentMethodData} from "../payment-method";
import {TotalOfferPrice} from "../offer";
import {PaymentRequestData} from "../payment-request";

export type OrderStatus = "pending" | "submitted" | "processing" | "complete" | string;

export interface OrderData {
  status: OrderStatus;
  reference?: string;
  to?: ShipmentTo;
  // Is it from a specific known location?
  from?: ShipmentFrom;
  // Partial in progress payment data, before the payment method is created or matched
  paymentMethod?: Partial<PaymentMethodData>
  // Partial in progress payment data, before the payment request is created or matched
  paymentRequest?: Partial<PaymentRequestData>
  paymentId?: string;
  paymentRequestId?: string;
  paymentMethodId?: string;
}

export interface Order extends OrderData, Partial<TotalOfferPrice> {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  products?: OrderProductItem[];
  services?: OrderServiceItem[];
}
