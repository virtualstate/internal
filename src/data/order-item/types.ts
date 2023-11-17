import {Identifier} from "../identifier";

export interface OrderItemIdentifierData {
  productId?: string;
  serviceId?: string;
  offerId?: string;
  quantity?: number; // Default 1
  identifiers?: Identifier[]; // Default []
}

export interface OrderItemData extends OrderItemIdentifierData, Record<string, unknown> {
  orderId: string;
}

export interface OrderItem extends OrderItemData {
  orderItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderProductItem extends OrderItem {
  productId: string;
}

export interface OrderServiceItem extends OrderItem {
  serviceId: string;
}

export interface OrderOfferItem extends OrderItem {
  offerId: string;
}

export type SetOrderItem = OrderItemData & Pick<OrderItem, "orderId" | "orderItemId"> & Partial<OrderItem>;