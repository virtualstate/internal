import {requestMethod} from "../routes.example";
import {v4} from "uuid";
import {cache} from "./cache";

requestMethod.post({ pathname: "/:type" }, async request => {
    const id = v4()
    const url = new URL(request.url);
    url.pathname = `${url.pathname}/${id}`;
    await cache.put(url, new Response(request.body, {
        headers: {
            "Content-Type": request.headers.get("Content-Type")
        }
    }));
    return new Response(null, {
        status: 201,
        headers: {
            Location: url.toString()
        }
    });
})