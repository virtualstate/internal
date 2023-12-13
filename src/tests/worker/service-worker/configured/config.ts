import {Config} from "../../../../worker/service-worker/configure/types";

// For example
const IS_DEVELOPMENT = true

export const config: Config = {
    services: [
        {
            name: "prices",
            url: "./prices.js"
        },
        {
            name: "products",
            url: "./products.js"
        },
        {
            name: "cart",
            url: "./cart.js",
            bindings: [
                {
                    protocol: "products",
                    service: "products"
                },
                {
                    protocol: "prices",
                    service: "prices"
                }
            ]
        }
    ],
    sockets: [
        ...(IS_DEVELOPMENT ? [
            {
                service: "prices",
                address: "*:3010"
            },
            {
                service: "products",
                address: "*:3011"
            }
        ] : []),
        {
            service: "cart",
            address: "*:3000"
        }
    ]
}