import {requestMethod} from "../routes.example";
import {v4} from "uuid";

requestMethod.post("/", async (request) => {
    const text = await request.text();
    return new Response(`${text}\nAdded line from B: ${v4()}`)
});