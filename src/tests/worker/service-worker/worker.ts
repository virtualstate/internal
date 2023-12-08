import type {DurableServiceWorkerScope} from "../../../worker/service-worker/types";
import type {FetchEvent} from "../../../fetch";
import {URLPattern} from "urlpattern-polyfill";

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
                        urlPattern: new URLPattern("https://*/*")
                    }
                ]
            },
            source: [
                {
                    type: "fetch-event",
                    tag: "fetch-any"
                }
            ]
        }
    ])

    event.waitUntil(Promise.resolve())
});

self.addEventListener("activate", event => {
    event.waitUntil(Promise.resolve())
})

self.addEventListener("fetch", event => {
    console.log("In fetch handler!", event.tag || "untagged");
    event.respondWith(onFetchEvent(event));
});


async function onFetchEvent(event: FetchEvent): Promise<Response> {
    console.log("onFetchEvent", event.request.url);
    return fetch(event.request);
}