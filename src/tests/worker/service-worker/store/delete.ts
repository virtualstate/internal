import {requestMethod} from "../routes.example";
import {cache} from "./cache";

requestMethod.delete({ pathname: "/:type/:id" }, async request => {
    await cache.delete(request.url);
    return new Response(null, {
        status: 204
    });
})