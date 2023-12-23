import {Config} from "../../../../worker/service-worker/configure/types";

export const config: Config = {
    services: [
        {
            name: "specific-named-data-service",
            url: `data:text/javascript,${encodeURIComponent(`
               addEventListener("fetch", event => event.respondWith(
                 fetch("internal-data-service")
               ));
            `)}`,
            bindings: [
                {
                    name: "internal-data-service",
                    service: {
                        url: `data:text/javascript,${encodeURIComponent(`
                           addEventListener("fetch", event => event.respondWith(
                             Response.json({ 
                               key: "value", 
                               message: "Hello from internal data worker" 
                             })
                           ));
                        `)}`,
                    }
                }
            ]
        },
        {
            name: "example",
            url: `data:text/javascript,${encodeURIComponent(`
               addEventListener("fetch", event => event.respondWith(
                 fetch("data-service")
               ));
            `)}`,
            bindings: [
                {
                   name: "data-service",
                   service: "specific-named-data-service"
                }
            ]
        }
    ],
    sockets: [
        {
            service: "example",
            address: "*:3010"
        },
    ]
}