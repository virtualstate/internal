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

requestMethod.get("/offers", async () => {
    const [
        prices,
        products
    ] = await Promise.all([
        json.get("products:/products"),
        json.get("prices:/prices")
    ]);

    const productPrices = Object.fromEntries(
        prices.map(
            ({ productId, value }: ProductPrice) => [productId, value] as const
        )
    );

    const offers = products
        .map((product: Product): ProductOffer => {
            const { productId } = product;
            const price = productPrices.get(productId);

            return {
                ...product,
                isAvailable: typeof price === "number",
                price,
                validUntil: new Date(Date.now() + DAY_MS).toISOString()
            }
        });

    return Response.json(offers);
})