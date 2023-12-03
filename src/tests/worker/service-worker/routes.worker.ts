import {requestMethod} from "./routes.example";

requestMethod.get("/test", () => {
    console.log("In get handler");
    return new Response("Hello from test get handler");
})

requestMethod.put("/test", (request) => {
    console.log("In put handler");
    return new Response(request.body, {
        headers: request.headers
    });
})