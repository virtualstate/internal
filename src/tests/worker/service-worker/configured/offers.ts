import {requestMethod} from "../routes.example";
import {json} from "./store";
import type {Product} from "./products";
import type {ProductPrice} from "./prices";
import {DAY_MS} from "../../../../data";

export interface ProductOffer extends Product {
    isAvailable: boolean
    price: number;
    validUntil: string;
}

console.log("Inside offers service worker!")

requestMethod.get({ pathname: "/offers" }, async () => {
    console.log("Inside offers fetch")
    const [
        products,
        prices,
    ] = await Promise.all([
        json.get<Product[]>("products:/products"),
        json.get<ProductPrice[]>("prices:/prices")
    ]);
    console.log({ prices, products });
 try {

     const productPrices = Object.fromEntries(
         prices.map(
             ({ productId, value }: ProductPrice) => [productId, value] as const
         )
     );

     const offers = products
         .map((product: Product): ProductOffer => {
             const { productId } = product;
             const price = productPrices[productId];

             return {
                 ...product,
                 isAvailable: typeof price === "number",
                 price,
                 validUntil: new Date(Date.now() + DAY_MS).toISOString()
             }
         });

     return Response.json(offers);
 } catch (error) {
     console.error(error);
     return Response.error();
 }
})