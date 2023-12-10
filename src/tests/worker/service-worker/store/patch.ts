import {requestMethod} from "../routes.example";
import {cache} from "./cache";
import {isMaybeJSONContentType} from "./is";

requestMethod.patch({ pathname: "/:type/:id" }, async request => {
    const match = await cache.match(request.url);
    if (!match) return new Response(null, { status: 404 });

    if (isMaybeJSONContentType(match) && isMaybeJSONContentType(request)) {
        const before = await match.json();
        const update = await request.json();
        const after = {
            ...before,
            ...update
        };
        const response = Response.json(after, {
            headers: {
                "Last-Modified": new Date().toUTCString()
            }
        })
        await cache.put(request.url, response.clone());
        return response;
    } else {
        console.log(match.headers, request.headers)
        return new Response("Unable to patch non JSON content", {
            status: 400
        });
    }
})