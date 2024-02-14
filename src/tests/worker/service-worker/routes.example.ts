import {FetchEvent} from "../../../fetch";
import {isRouteMatchCondition, RouterRule, URLPatternInit} from "../../../worker/service-worker/router";
import {DurableServiceWorkerScope} from "../../../worker/service-worker/types";

declare var self: DurableServiceWorkerScope;

export type RouterRequestMethodLower = "get" | "put" | "post" | "delete" | "options" | "patch" | "head"

export interface OnRequestFn {
    (request: Request, event: FetchEvent): Response | undefined | void | Promise<Response | undefined | void>
}

export interface AddRouteAndHandlerFn {
    (pathnameOrInit: string | URLPatternInit, onRequest: OnRequestFn): void
}

export const requestMethod = makeRequestMethod();

function makeRequestMethod(): Record<RouterRequestMethodLower, AddRouteAndHandlerFn> {
    return {
        get: makeAddRequestMethodRouteAndHandler("get"),
        patch: makeAddRequestMethodRouteAndHandler("patch"),
        put: makeAddRequestMethodRouteAndHandler("put"),
        post: makeAddRequestMethodRouteAndHandler("post"),
        delete: makeAddRequestMethodRouteAndHandler("delete"),
        options: makeAddRequestMethodRouteAndHandler("options"),
        head: makeAddRequestMethodRouteAndHandler("head")
    }
}

function makeAddRequestMethodRouteAndHandler(requestMethod: RouterRequestMethodLower): AddRouteAndHandlerFn {
    return function addRequestRouteAndHandler(
        pathnameOrInit: string | URLPatternInit,
        onRequest: OnRequestFn) {
        return addRequestMethodRouteAndHandler(
            requestMethod,
            pathnameOrInit,
            onRequest
        )
    }
}

function addRequestMethodRouteAndHandler(
    requestMethod: string,
    urlPattern: string | URLPatternInit,
    onRequest: OnRequestFn
) {
    const id = `${requestMethod}:${JSON.stringify(urlPattern)}`;
    const route: RouterRule = {
        condition: [
            {
                requestMethod
            },
            {
                urlPattern
            }
        ],
        source: {
            type: "fetch-event",
            id
        }
    };

    self.addEventListener("install", event => {
        event.addRoutes(route)
    });
    self.addEventListener("fetch", event => {
        if (event.routeId === id) {
            event.waitUntil(intercept());
        } else if (!event.routeId && isRouteMatchCondition(self.registration.durable, route, event.request)) {
            event.waitUntil(intercept());
        }

        async function intercept() {
            const response = await onRequest(event.request, event);
            if (response) {
                event.respondWith(response);
            }
        }
    });
}