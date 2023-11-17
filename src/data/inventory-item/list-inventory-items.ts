import {InventoryItem, InventoryItemStatus, InventoryOffer, InventoryProduct} from "./types";
import { getInventoryItemStore } from "./store";
import {listInventory, ListInventoryInput} from "../inventory";
import {OrderProductItem} from "../order-item";
import {getOffer, OfferItem, ProductOfferItem} from "../offer";

export interface ListInventoryItemsInput extends ListInventoryInput {
  inventoryId?: string;
  itemId?: string;
  status?: InventoryItemStatus;
}

export async function listInventoryItems(options: ListInventoryItemsInput): Promise<
    InventoryItem[]
> {
  // TODO make this not all in memory
  // Its okay for now :)
  const { inventoryId } = options;
  if (!inventoryId) {
    const inventory = await listInventory(options);
    const values = await Promise.all(
        inventory.map(
            async ({ inventoryId }) => listInventoryItems({
              ...options,
              inventoryId
            })
        )
    );
    return values.flatMap<InventoryItem>(value => value);
  }
  const { itemId, status } = options;
  const store = getInventoryItemStore(inventoryId);
  let values = await store.values();
  if (itemId) {
    values = values.filter(value => value.productId === itemId);
  }
  if (status) {
    values = values.filter(value => value.status === status);
  }
  return values;
}

export async function listInventoryProducts(options: ListInventoryItemsInput, offers = true): Promise<
    InventoryProduct[]
    > {
  const items = await listInventoryItems(options);
  const products = items.filter(isInventoryProduct);
  if (!offers) return products;
  const offerProducts = await Promise.all(
      items
          .filter(isInventoryOffer)
          .map(async (item): Promise<InventoryProduct[]> => {
            const offer = await getOffer(item.offerId);
            return offer.items
                .filter(isProductOfferItem)
                .map((offer): InventoryProduct => ({
                  ...item,
                  offerId: undefined,
                  productId: offer.productId,
                  quantity: (offer.quantity ?? 1) * (item.quantity ?? 1),
                  identifiers: offer.identifiers
                }))
          })
  );

  return offerProducts
      .flatMap<InventoryProduct>(value => value)
      .concat(products);

  function isProductOfferItem(item: OfferItem): item is ProductOfferItem {
    return item.type === "product";
  }
}

function isInventoryProduct(item: InventoryItem): item is InventoryProduct {
  return !!item.productId;
}

function isInventoryOffer(item: InventoryItem): item is InventoryOffer {
  return !!item.offerId;
}