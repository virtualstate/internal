import {requestMethod} from "../routes.example";

export interface ProductPrice {
    productId: string;
    value: number;
}

const prices: ProductPrice[] = [
    {
        productId: "apples",
        value: 1.2
    },
    {
        productId: "pears",
        value: 1.5
    },
    {
        productId: "limes",
        value: 4
    }
]

console.log("Inside prices service worker!")

requestMethod.get({ pathname: "/prices" }, () => {
    console.log("Inside prices fetch")
    return Response.json(prices)
})