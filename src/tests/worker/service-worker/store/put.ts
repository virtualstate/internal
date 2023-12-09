import {requestMethod} from "../routes.example";
import {cache} from "./cache";

requestMethod.put({ pathname: "/:type/:id" }, async request => {
    await cache.put(request.url, new Response(request.body, {
        headers: {
            "Content-Type": request.headers.get("Content-Type"),
            "Last-Modified": new Date().toUTCString()
        }
    }));
    return new Response(null, {
        status: 204
    });
})