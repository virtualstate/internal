import {Config} from "../../../../worker/service-worker/configure/types";

export const config: Config = {
    services: [
        {
            name: "example",
            url: `data:text/javascript,${encodeURIComponent(`
               addEventListener("fetch", event => event.respondWith(
                 Response.json({ 
                   key: "value", 
                   message: "Hello from data worker" 
                 })
               ));
            `)}`
        }
    ],
    sockets: [
        {
            service: "example",
            address: "*:3010"
        },
    ]
}