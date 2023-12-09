import {requestMethod} from "../routes.example";
import {cache} from "./cache";

requestMethod.get({ pathname: "/" }, async () => {
   const keys = await cache.keys();
   const items = keys
       .filter(key => key.method === "GET")
       .map(key => ({
           url: key.url,
           headers: {
               "Content-Type": key.headers.get("Content-Type")
           }
       }));
   return Response.json(items);
});

requestMethod.get({ pathname: "/:type" }, async request => {
    const keys = await cache.keys();
    const items = keys
        .filter(key => key.method === "GET")
        .filter(key => key.url.startsWith(request.url))
        .map(key => ({
            url: key.url,
            headers: {
                "Content-Type": key.headers.get("Content-Type")
            }
        }));
    return Response.json(items);

})

requestMethod.get({ pathname: "/:type/:id" }, async request => {
    const match = await cache.match(request);
    return match ?? new Response(null, {
        status: 404
    });
})