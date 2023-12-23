import {Config} from "../../../../worker/service-worker/configure/types";

export const config: Config = {
    services: [
        {
            name: "update-service",
            url: () => async (request: Request) => {
                const cache = await caches.open("service-cache");
                await cache.put(request.url, new Response(request.clone().body, {
                    headers: request.headers
                }));
                return Response.json({ updated: true })
            }
        },
        {
          name: "get-service",
          url: () => async (request: Request) => {
            const cache = await caches.open("service-cache");
            const match = await cache.match(request);
            return match ?? new Response(null, { status: 404 })
          }
        },
        {
            name: "example",
            url: () => async () => {
                const value = `Some value: ${Math.random()}`;
                await fetch("data-service/1", {
                    method: "PUT",
                    body: value
                });
                const response = await fetch("data-service/1");
                return Response.json({
                    status: response.status,
                    expected: value,
                    received: await response.text()
                });
            },
            bindings: [
                {
                    routes: {
                        condition: {
                            requestMethod: "put"
                        }
                    },
                    service: "update-service"
                },
                {
                    name: "data-service",
                    routes: {
                        condition: {
                            requestMethod: "get"
                        }
                    },
                    service: "get-service"
                }
            ]
        }
    ],
    sockets: [
        {
            service: "example",
            address: "*:3010"
        },
    ]
}