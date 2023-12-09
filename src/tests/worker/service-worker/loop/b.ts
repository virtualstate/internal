import {requestMethod} from "../routes.example";
import {getRegistrations} from "./registration";

const { c } = await getRegistrations();

requestMethod.post("/", async (request) => {
    const { limit, count, visitedB, ...rest } = await request.json();

    console.log("B", { limit, count, visitedB, ...rest });

    if (count && count >= limit) {
        return Response.json({ count, final: "b", visitedB, ...rest });
    }

    return c.fetch("/", {
        method: "POST",
        body: JSON.stringify({
            limit,
            count: (count ?? 0) + 1,
            ...rest,
            visitedB: (visitedB ?? 0) + 1
        })
    })
});