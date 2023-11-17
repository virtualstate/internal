self.addEventListener("fetch", event => {
    console.log(event.request.method, event.request.url);
    event.respondWith(new Response("Hello"))
});