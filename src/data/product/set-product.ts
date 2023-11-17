import { Product, ProductData } from "./types";
import { getProductStore } from "./store";

export async function setProduct(
  data: ProductData & Pick<Product, "productId"> & Partial<Product>
): Promise<Product> {
  const store = await getProductStore();
  const updatedAt = new Date().toISOString();
  const document: Product = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
  };
  await store.set(data.productId, document);
  return document;
}