import {requestMethod} from "../routes.example";
import {cache} from "./cache";

requestMethod.head({ pathname: "/:type/:id" }, async request => {
    const match = await cache.match(request);
    return new Response(null, {
        status: match ? 200 : 404,
        headers: {
            "Content-Type": match?.headers.get("Content-Type"),
            "Last-Modified": (
                match?.headers.get("Last-Modified") ??
                match?.headers.get("Date")
            )
        }
    });
})