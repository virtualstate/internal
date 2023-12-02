import {URLPattern} from "urlpattern-polyfill";
import {RequestInit, RequestMethod} from "@opennetwork/http-representation";
import {getConfig} from "../../config";
import {DurableServiceWorkerScope} from "./types";
import {getKeyValueStore} from "../../data";
import {getServiceWorkerId} from "./service-worker-config";
import {v4} from "uuid";
import {DurableServiceWorkerRegistration, listServiceWorkerIds, listServiceWorkers} from "./container";
import {createServiceWorkerFetch} from "./execute-fetch";
import {ok} from "../../is";

export type RouterSourceEnum = "network" | "cache" | "fetch-event" | "race-network-and-fetch-handler";
export type RunningStatusEnum = "running" | "stopped";
export type RouterSourceBehaviorEnum = "finish-with-success" | "continue-discarding-latter-results";

export interface RouterSource {
    type: RouterSourceEnum;
    behaviorEnum?: RouterSourceBehaviorEnum;
}

export interface RouterNetworkSource extends RouterSource {
    updatedCacheName?: string;
    cacheErrorResponse?: boolean
}

export interface RouterCacheSource extends RouterSource {
    cacheName: string;
    request?: Request;
}

export interface RouterFetchEventSource extends RouterSource {
    id?: string;
}

export interface RouterURLPatternCondition {
    urlPattern: URLPattern | string;
}

export interface RouterRequestMethodCondition {
    requestMethod: RequestMethod;
}

export interface RouterRequestModeCondition {
    requestMode: RequestMode;
}

export interface RouterRequestDestinationCondition {
    requestDestination: RequestDestination;
}

export type RouterRequestCondition =
    | RouterRequestMethodCondition
    | RouterRequestModeCondition
    | RouterRequestDestinationCondition

export interface RouterTimeCondition {
    timeFrom?: number;
    timeTo?: number;
}

export interface RouterAndCondition {
    and: RouterCondition[];
}

export interface RouterNotCondition {
    not: RouterCondition;
}

export interface RouterRunningStatusCondition {
    runningStatus: RunningStatusEnum;
}

export interface RouterOrCondition {
    or: RouterCondition[];
}

export type RouterCondition =
    | RouterURLPatternCondition
    | RouterRequestCondition
    | RouterTimeCondition
    | RouterRunningStatusCondition
    | RouterAndCondition
    | RouterOrCondition
    | RouterNotCondition;

export type RouterRuleSource =
    | RouterNetworkSource
    | RouterSource
    | RouterCacheSource
    | RouterFetchEventSource
    | RouterSourceEnum;

export interface RouterRule {
    condition: RouterCondition | RouterCondition[]
    source: RouterRuleSource | RouterRuleSource[];
}

export type AddRoutesOptions = RouterRule | RouterRule[]

const STORE_NAME = "serviceWorkerRoutes"

export function getServiceWorkerRoutesStore(serviceWorkerId = getServiceWorkerId()) {
    return getKeyValueStore<RouterRule>(`${STORE_NAME}:${serviceWorkerId}`)
}

export async function addRoutes(rules: AddRoutesOptions) {
    if (!Array.isArray(rules)) {
        return addRoutes([rules]);
    }

    const store = getServiceWorkerRoutesStore();
    for (const rule of rules) {
        await store.set(v4(), rule);
    }
}

export function listRoutes(serviceWorkerId = getServiceWorkerId()) {
    const store = getServiceWorkerRoutesStore(serviceWorkerId);
    return store.values();
}

export async function createRouter(serviceWorkers?: DurableServiceWorkerRegistration[]): Promise<typeof fetch> {
    const resolveServiceWorkers = serviceWorkers ?? await listServiceWorkers();
    const serviceWorkerRoutes = await Promise.all(
        resolveServiceWorkers.map(
            async ({ durable: { serviceWorkerId }}) => {
                return [
                    serviceWorkerId,
                    await listRoutes(serviceWorkerId)
                ] as const;
            }
        )
    )

    const fetchers = Object.fromEntries(
        resolveServiceWorkers.map(
            serviceWorker => [
                serviceWorker.durable.serviceWorkerId,
                createServiceWorkerFetch(serviceWorker)
            ]
        )
    )

    function match(input: RequestInfo | URL, init?: RequestInit) {
        for (const [serviceWorkerId, routes] of serviceWorkerRoutes) {
            for (const route of routes) {
                if (isRouteMatch(route, input, init)) {
                    return {
                        serviceWorkerId,
                        route
                    } as const
                }
            }
        }
    }

    function isRouteMatch(route: RouterRule, input: RequestInfo | URL, init?: RequestInit) {
        // TODO
        return true;
    }

    return async function (input, init) {
        const found = match(input, init);
        if (!found) {
            throw new Error("FetchError: No match for this router");
        }
        const { serviceWorkerId } = found;
        const fetch = fetchers[serviceWorkerId];
        ok(fetch, "Expected to find fetcher for service worker, internal state corrupt");
        return fetch(input, init);
    }
}