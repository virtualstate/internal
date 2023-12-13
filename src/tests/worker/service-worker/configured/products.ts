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

requestMethod.get("/products", () => {
    return Response.json(products)
})