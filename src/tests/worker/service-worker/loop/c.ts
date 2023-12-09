import {requestMethod} from "../routes.example";
import {getRegistrations} from "./registration";

const { a } = await getRegistrations();

requestMethod.post("/", async (request) => {
    const { limit, count, visitedC, ...rest } = await request.json();

    console.log("C", { limit, count, visitedC, ...rest });

    if (count && count >= limit) {
        return Response.json({ count, final: "c", visitedC, ...rest });
    }

    return a.fetch("/", {
        method: "POST",
        body: JSON.stringify({
            limit,
            count: (count ?? 0) + 1,
            ...rest,
            visitedC: (visitedC ?? 0) + 1
        })
    })
});