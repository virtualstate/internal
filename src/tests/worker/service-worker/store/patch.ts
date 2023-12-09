import {requestMethod} from "../routes.example";
import {cache} from "./cache";

function isMaybeJSONContentType({ headers }: { headers: Headers }) {
    if (!headers.has("Content-Type")) return true;
    return headers.get("Content-Type") === "application/json";
}

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
        await cache.put(request.url, Response.json(after));
        return Response.json(after);
    } else {
        console.log(match.headers, request.headers)
        return new Response("Unable to patch non JSON content", {
            status: 400
        });
    }
})