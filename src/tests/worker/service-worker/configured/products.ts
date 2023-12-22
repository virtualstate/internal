import {requestMethod} from "../routes.example";

export interface Product {
    productId: string;
    productName: string;
}

const products: Product[] = [
    {
        productId: "apples",
        productName: "Apples"
    },
    {
        productId: "pears",
        productName: "Pears"
    },
    {
        productId: "limes",
        productName: "Limes"
    }
]

console.log("Inside products service worker!")

requestMethod.get({ pathname: "/products" }, () => {
    console.log("Inside products fetch")
    return Response.json(products)
})