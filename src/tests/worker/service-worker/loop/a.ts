import {requestMethod} from "../routes.example";
import {getRegistrations} from "./registration";

const { b } = await getRegistrations();

requestMethod.post("/", async (request) => {
    const { limit, count, visitedA, ...rest } = await request.json();

    console.log("A", { limit, count, visitedA, ...rest });

    if (count && count >= limit) {
        return Response.json({ count, final: "a", visitedA, ...rest });
    }

    return b.fetch("/", {
        method: "POST",
        body: JSON.stringify({
            limit,
            count: (count ?? 0) + 1,
            ...rest,
            visitedA: (visitedA ?? 0) + 1
        })
    })
});