import {DurableServiceWorkerScope} from "../../../../worker/service-worker/types";

declare var self: DurableServiceWorkerScope;

self.addEventListener("fetch", event => {
    event.respondWith(respond());

    async function respond() {
        const text = await event.request.text();
        return new Response(
            `${text}\nAdded line from A: ${Math.random()}`
        )
    }
})