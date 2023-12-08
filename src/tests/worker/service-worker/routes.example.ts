import {FetchEvent} from "../../../fetch";
import {RouterRule, URLPatternInit} from "../../../worker/service-worker/router";
import {DurableServiceWorkerScope} from "../../../worker/service-worker/types";

declare var self: DurableServiceWorkerScope;

export type RouterRequestMethodLower = "get" | "put" | "post" | "delete" | "options" | "patch"

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
        options: makeAddRequestMethodRouteAndHandler("options")
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
    const tag = `${requestMethod}:${JSON.stringify(urlPattern)}`;
    self.addEventListener("install", event => {
        event.addRoutes({
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
                tag
            }
        })
    });
    self.addEventListener("fetch", event => {
        if (event.tag === tag) {
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