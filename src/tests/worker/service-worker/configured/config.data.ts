import {Config} from "../../../../worker/service-worker/configure/types";

export const config: Config = {
    services: [
        {
            name: "specific-named-data-service",
            url: `data:text/javascript,${encodeURIComponent(`
               addEventListener("fetch", event => event.respondWith(
                 Response.json({ 
                   key: "value", 
                   message: "Hello from a specific data worker" 
                 })
               ));
            `)}`
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