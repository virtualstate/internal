import {caches} from "../fetch";
import {ok} from "../is";
import {dispatchEvent} from "../events";
import {v4} from "uuid";

{
    const name = v4();
    const cache = await caches.open(name);

    let response;
    if (!(response = await cache.match("https://example.com"))) {
        response = await fetch("https://example.com");
        await cache.put(response.url, response);
    }
    ok(await response.text());
    const match = await cache.match("https://example.com");
    ok(match);
    ok(await match.text());

    await caches.delete(name)
}

{
    const name = v4();
    const cache = await caches.open(name);
    const url = "https://example.com";

    const initial = await cache.match(url);

    ok(!initial);

    await dispatchEvent({
        type: "fetch",
        schedule: {
            immediate: true
        },
        request: {
            url
        },
        cache: {
            name
        }
    });

    const match = await cache.match(url);

    ok(match);
    ok(match.ok);

    await caches.delete(name);

    const deleted = await cache.match(url);

    ok(!deleted);
}