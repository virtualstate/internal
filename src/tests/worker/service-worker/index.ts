import {DurableServiceWorkerRegistration, serviceWorker} from "../../../worker/service-worker/container";
import {dirname, join} from "node:path";
import {executeServiceWorkerWorker, executeServiceWorkerWorkerMessage} from "../../../worker/service-worker/execute";
import {v4} from "uuid";
import {caches} from "../../../fetch";
import {ok} from "../../../is";
import {
    executeServiceWorkerFetch,
    registerServiceWorkerFetch
} from "../../../worker/service-worker/execute-fetch";
import {fileURLToPath} from "node:url";
import {createRouter, listRoutes} from "../../../worker/service-worker/router";

export {};

const pathname = fileURLToPath(import.meta.url);
const worker = join(dirname(pathname), "./worker.js");

async function waitForServiceWorker(registration: DurableServiceWorkerRegistration) {
    if (registration.active) {
        return registration.active;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    await registration.update();
    return waitForServiceWorker(registration);
}


{
    const registration = await serviceWorker.register(worker);
    const url = "https://example.com";
    const cache = await caches.open(v4());
    ok(!await cache.match(url));

    // Fetch event is a void execute
    await executeServiceWorkerWorkerMessage({
        serviceWorkerId: registration.durable.serviceWorkerId,
        event: {
            type: "fetch",
            request: {
                url
            },
            cache: cache.name,
            virtual: true
        }
    })

    // Once fetched, we will have a match
    const match = await cache.match(url);
    ok(match);
    console.log(await match.text());

    await caches.delete(cache.name);

    console.log("Finished service worker");
}

{
    const registration = await serviceWorker.register(worker);
    const url = "https://example.com";

    const response = await executeServiceWorkerFetch(registration, {
        url
    })

    console.log(response.status);
    console.log(await response.text());
}

{
    const fetch = await registerServiceWorkerFetch(worker);

    {
        const response = await fetch("https://example.com");
        ok(response.ok);
        console.log(await response.text());
    }


}

{
    const registration = await serviceWorker.register(worker);

    const routes = await listRoutes(registration.durable.serviceWorkerId);

    ok(routes.length);

    const fetch = await createRouter([
        registration
    ]);

    const response = await fetch("https://example.com");

    console.log(response.status, routes);
    ok(response.ok);

}