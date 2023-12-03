import {serviceWorker} from "../../../worker";
import {createRouter} from "../../../worker/service-worker/router";
import {ok} from "../../../is";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {v4} from "uuid";
import {waitForServiceWorker} from "./wait";

export {};

const pathname = fileURLToPath(import.meta.url);
const worker = join(dirname(pathname), "./routes.worker.js");

{
    const registration = await serviceWorker.register(worker);

    const fetch = await createRouter([
        registration
    ]);

    // wait for activated before starting to route
    // note we can create the router earlier than installing, though register needs to be done ahead of time
    await waitForServiceWorker(registration);

    {
        const response = await fetch("/test");

        console.log(response.status);
        ok(response.ok);

        console.log(await response.text());
    }

    {
        const body = `SOMETHING RANDOM: ${v4()}`

        const response = await fetch("/test", {
            method: "PUT",
            body
        });

        console.log(response.status);
        ok(response.ok);

        const text = await response.text();

        console.log(text);
        ok(text === body, "Expected returned body to match");
    }



}