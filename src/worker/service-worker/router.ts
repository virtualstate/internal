import {URLPattern} from "urlpattern-polyfill";
import {getKeyValueStore} from "../../data";
import {getServiceWorkerId} from "./service-worker-config";
import {v4} from "uuid";
import {DurableServiceWorkerRegistration, listServiceWorkers} from "./container";
import {createServiceWorkerFetch} from "./execute-fetch";
import {ok} from "../../is";
import {caches} from "../../fetch";

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
    cacheName?: string;
    request?: Request;
}

export interface RouterFetchEventSource extends RouterSource {
    id?: string;
}

export interface RouterURLPatternCondition {
    urlPattern: URLPattern | string;
}

export interface RouterRequestMethodCondition {
    requestMethod: string;
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

export function isRouterURLPatternCondition(condition: RouterCondition): condition is RouterURLPatternCondition {
    return "urlPattern" in condition;
}

export function isRouterRequestMethodCondition(condition: RouterCondition): condition is RouterRequestMethodCondition {
    return "requestMethod" in condition;
}

export function isRouterRequestModeCondition(condition: RouterCondition): condition is RouterRequestModeCondition {
    return "requestMode" in condition;
}

export function isRouterRequestDestinationCondition(condition: RouterCondition): condition is RouterRequestDestinationCondition {
    return "requestDestination" in condition;
}

export function isRouterCacheSource(source: RouterRuleSource): source is RouterCacheSource {
    return isRouterSourceObject(source) && source.type === "cache";
}

export function isRouterRequestCondition(condition: RouterCondition): condition is RouterRequestCondition {
    return (
        isRouterRequestMethodCondition(condition) ||
        isRouterRequestModeCondition(condition) ||
        isRouterRequestDestinationCondition(condition)
    );
}

export function isRouterTimeCondition(condition: RouterCondition): condition is RouterTimeCondition {
    return (
        "timeFrom" in condition ||
        "timeTo" in condition
    );
}

export function isRouterRunningStatusCondition(condition: RouterCondition): condition is RouterRunningStatusCondition {
    return "runningStatus" in condition;
}

export function isRouterAndCondition(condition: RouterCondition): condition is RouterAndCondition {
    return "and" in condition && Array.isArray(condition.and);
}

export function isRouterOrCondition(condition: RouterCondition): condition is RouterOrCondition {
    return "or" in condition && Array.isArray(condition.or);
}

export function isRouterNotCondition(condition: RouterCondition): condition is RouterNotCondition {
    return "not" in condition && Boolean(condition.not);
}

export function isRouterSourceObject(source: RouterRuleSource): source is RouterNetworkSource {
    return (
        typeof source === "object" &&
        "type" in source
    );
}

export function isRouterSourceType(source: RouterRuleSource, type: RouterSourceEnum) {
    return (
        source === type ||
        (
            isRouterSourceObject(source) &&
            source.type === type
        )
    );
}

export function isRouterNetworkSource(source: RouterRuleSource): source is RouterNetworkSource {
    return isRouterSourceObject(source) && source.type === "network";
}


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
        const safe = JSON.parse(
            JSON.stringify(
                rule,
                (key, value) => {
                    // How fun right...
                    // Will need to resolve this in the storage layer instead.
                    // Should allow cloneable objects and extending this.
                    if (value instanceof URLPattern) {
                        return {
                            protocol: value.protocol,
                            username: value.username,
                            password: value.password,
                            hostname: value.hostname,
                            port: value.port,
                            pathname: value.pathname,
                            search: value.search,
                            hash: value.hash
                        };
                    } else if (value instanceof Request) {
                        // a cache source can define a request to use as a key...
                        // this isn't the exact same, but it will be used as the key in:
                        //   cache.put(value.url, response)
                        //
                        // This would be different from what a real service worker might do, so
                        // I will definitely need to find a solution for objects just like URLPattern
                        return value.url;
                    } else {
                        return value;
                    }
                }
            )
        )
        await store.set(v4(), safe);
    }
}

export function listRoutes(serviceWorkerId = getServiceWorkerId()) {
    const store = getServiceWorkerRoutesStore(serviceWorkerId);
    return store.values();
}

export function isRouteMatchCondition(serviceWorker: DurableServiceWorkerRegistration, route: RouterRule, input: RequestInfo | URL, init?: RequestInit) {

    return isConditionsMatch(route.condition);

    function isConditionsMatch(conditions: RouterCondition | RouterCondition[]): boolean {
        if (Array.isArray(conditions)) {
            if (!conditions.length) {
                throw new Error("Expected at least one condition");
            }
            for (const condition of conditions) {
                if (!isConditionMatch(condition)) {
                    return false;
                }
            }
            return true;
        } else {
            return isConditionMatch(conditions);
        }
    }

    function isRouterURLPatternConditionMatch(condition: RouterURLPatternCondition): boolean {
        const url = input instanceof URL ?
            input :
            typeof input === "string" ?
                input :
                input.url;

        const { urlPattern } = condition;

        if (typeof urlPattern === "string") {
            // TODO, confirm this is correct
            // Explainer does mention:
            //
            //   For a USVString input, a ServiceWorker script's URL is used as a base URL.
            //
            // My current assumption is we are completely comparing the URL and search params here
            const matchInstance = new URL(url, serviceWorker.durable.url);
            const patternInstance = new URL(urlPattern, serviceWorker.durable.url);
            return matchInstance.toString() === patternInstance.toString();
        } else {
            if (urlPattern.test) {
                return urlPattern.test(url, serviceWorker.durable.url);
            } else {
                const pattern = new URLPattern(urlPattern);
                return pattern.test(url, serviceWorker.durable.url);
            }
        }
    }

    function isRouterRequestConditionMatch(condition: RouterRequestCondition): boolean {
        if (typeof input === "string" || input instanceof URL) {
            const { method, mode }: RequestInit = init || {}
            if (isRouterRequestMethodCondition(condition)) {
                if (method) {
                    if (method.toUpperCase() !== condition.requestMethod.toUpperCase()) {
                        return false;
                    }
                } else {
                    if (condition.requestMethod.toUpperCase() !== "GET") {
                        return false;
                    }
                }
            }
            if (isRouterRequestModeCondition(condition)) {
                if (mode) {
                    if (mode !== condition.requestMode) {
                        return false;
                    }
                } else {
                    // Assuming that fetch follows creating a new Request object
                    // From https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
                    //   For example, when a Request object is created using the Request() constructor, the value of the mode property for that Request is set to cors.
                    //
                    // undici uses new Request
                    //
                    // https://github.com/nodejs/undici/blob/8535d8c8e3937d73037272ffb411c7b14b036917/lib/fetch/index.js#L136
                    // https://github.com/nodejs/undici/blob/8535d8c8e3937d73037272ffb411c7b14b036917/lib/fetch/request.js#L100
                    if (condition.requestMode !== "cors") {
                        return false;
                    }
                }
            }
            if (isRouterRequestDestinationCondition(condition)) {
                // default destination is ''
                // https://developer.mozilla.org/en-US/docs/Web/API/Request/destination#sect1
                if (condition.requestDestination !== "") {
                    return false;
                }
            }
        } else {
            const { method, mode, destination } = input;
            if (isRouterRequestMethodCondition(condition)) {
                if (method.toUpperCase() !== condition.requestMethod.toUpperCase()) {
                    return false;
                }
            }
            if (isRouterRequestModeCondition(condition)) {
                if (mode !== condition.requestMode) {
                    return false;
                }
            }
            if (isRouterRequestDestinationCondition(condition)) {
                if (destination !== condition.requestDestination) {
                    return false;
                }
            }
        }

        return true;
    }

    function isAndConditionMatch(condition: RouterAndCondition): boolean {
        return condition.and.every(isConditionMatch);
    }

    function isOrConditionMatch(condition: RouterOrCondition): boolean {
        const index = condition.or.findIndex(isNotConditionMatch);
        return index === -1;
    }

    function isNotConditionMatch(condition: RouterNotCondition): boolean {
        return !isConditionsMatch(condition.not);
    }

    function isConditionMatch(condition: RouterCondition): boolean {
        if (isRouterURLPatternCondition(condition)) {
            return isRouterURLPatternConditionMatch(condition);
        }

        if (isRouterRequestCondition(condition)) {
            return isRouterRequestConditionMatch(condition);
        }

        if (isRouterAndCondition(condition)) {
            return isAndConditionMatch(condition);
        }

        if (isRouterOrCondition(condition)) {
            return isOrConditionMatch(condition);
        }

        if (isRouterNotCondition(condition)) {
            return isNotConditionMatch(condition);
        }

        return false;
    }
}

export async function createRouter(serviceWorkers?: DurableServiceWorkerRegistration[]): Promise<typeof fetch> {
    const resolveServiceWorkers = serviceWorkers ?? await listServiceWorkers();
    const serviceWorkerRoutes = new Map<DurableServiceWorkerRegistration, RouterRule[]>();

    const fetchers = new Map(
        resolveServiceWorkers.map(
            serviceWorker => [
                serviceWorker,
                createServiceWorkerFetch(serviceWorker)
            ]
        )
    )

    async function listServiceWorkerRoutes(serviceWorker: DurableServiceWorkerRegistration) {
        const existing = serviceWorkerRoutes.get(serviceWorker);
        if (existing) {
            return existing;
        }
        const routes = await listRoutes(serviceWorker.durable.serviceWorkerId);
        serviceWorkerRoutes.set(serviceWorker, routes);
        return routes;
    }

    async function match(input: RequestInfo | URL, init?: RequestInit) {
        for (const serviceWorker of resolveServiceWorkers) {
            const routes = await listServiceWorkerRoutes(serviceWorker);
            for (const route of routes) {
                if (isRouteMatchCondition(serviceWorker, route, input, init)) {
                    return {
                        serviceWorker,
                        route
                    } as const
                }
            }
        }
    }

    return async function (input, init) {
        const found = await match(input, init);
        if (!found) {
            throw new Error("FetchError: No match for this router");
        }
        const { serviceWorker, route } = found;

        const serviceWorkerFetch = fetchers.get(serviceWorker);
        ok(serviceWorkerFetch, "Expected to find fetcher for service worker, internal state corrupt");

        return sources(route.source);

        async function sources(ruleSource: RouterRuleSource | RouterRuleSource[]) {
            if (Array.isArray(ruleSource)) {
                let returningResponse: Response;
                for (const singleRuleSource of ruleSource) {
                    try {
                        const response = await source(singleRuleSource);
                        // TODO, should response.ok be true here as well

                        // TODO behaviorEnum
                        // if (returningResponse) {
                        //     continue;
                        // }
                        // if (isRouterSourceObject(singleRuleSource)) {
                        //     if (singleRuleSource.behaviorEnum === "continue-discarding-latter-results") {
                        //         returningResponse = returningResponse || response;
                        //         continue;
                        //     }
                        // }

                        if (response) {
                            return response;
                        }
                    } catch {
                        // Source failed, or could not match
                    }
                }
                if (returningResponse)  {
                    return returningResponse;
                }
                throw new Error("Could not resolve response");
            } else {
                return source(ruleSource)
            }
        }

        async function source(ruleSource: RouterRuleSource): Promise<Response | undefined> {
            if (isRouterSourceType(ruleSource, "network")) {
                const response = await fetch(clone(), init);
                if (isRouterNetworkSource(ruleSource)) {
                    if (ruleSource.updatedCacheName) {
                        if (ruleSource.cacheErrorResponse || response.ok) {
                            const cache = await caches.open(ruleSource.updatedCacheName);
                            await cache.put(cacheKey(), response.clone());
                        }
                    }
                }
                return response;
            }
            if (isRouterSourceType(ruleSource, "fetch-event")) {
                return serviceWorkerFetch(clone(), init);
            }
            if (isRouterSourceType(ruleSource, "race-network-and-fetch-handler")) {
                return Promise.race([
                    source("network"),
                    source("fetch-event")
                ]);
            }
            if (isRouterSourceType(ruleSource, "cache")) {
                if (isRouterCacheSource(ruleSource)) {
                    const cache = await caches.open(ruleSource.cacheName || "default");
                    return cache.match(cacheKey(ruleSource.request));
                } else {
                    const cache = await caches.open("default");
                    return cache.match(cacheKey())
                }
            }
            throw new Error("Unknown source type");
        }

        function cacheKey(request?: RequestInfo) {
            if (request) {
                if (request instanceof Request) {
                    return request.clone();
                } else {
                    return new Request(request);
                }
            }
            if (!init) {
                return clone();
            } else {
                return new Request(clone(), init);
            }
        }

        function clone() {
            if (input instanceof Request) {
                return input.clone()
            } else {
                return input;
            }
        }

    }
}