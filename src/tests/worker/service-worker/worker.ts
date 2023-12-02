import type {DurableServiceWorkerScope} from "../../../worker/service-worker/types";
import type {FetchEvent} from "../../../fetch";

declare var self: DurableServiceWorkerScope;

console.log("in test service worker");

self.addEventListener("install", event => {
    event.addRoutes([
        {
            condition: {
                and: [
                    {
                        requestMethod: "GET"
                    },
                    {
                        urlPattern: "https://*/*"
                    }
                ]
            },
            source: "network"
        }
    ])

    event.waitUntil(Promise.resolve())
});

self.addEventListener("activate", event => {
    event.waitUntil(Promise.resolve())
})

self.addEventListener("fetch", event => {
    event.respondWith(onFetchEvent(event));
});


async function onFetchEvent(event: FetchEvent): Promise<Response> {
    console.log("onFetchEvent", event.request.url);
    return fetch(event.request);
}