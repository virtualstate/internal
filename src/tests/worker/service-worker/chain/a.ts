import {requestMethod} from "../routes.example";

requestMethod.post("/", async (request) => {
    const text = await request.text();
    return new Response(`${text}\nAdded line from A: ${Math.random()}`)
});