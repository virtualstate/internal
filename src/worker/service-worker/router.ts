import {URLPattern} from "urlpattern-polyfill";
import {RequestMethod} from "@opennetwork/http-representation";
import {getConfig} from "../../config";
import {DurableServiceWorkerScope} from "./types";
import {getKeyValueStore} from "../../data";
import {getServiceWorkerId} from "./service-worker-config";
import {v4} from "uuid";
import {DurableServiceWorkerRegistration, listServiceWorkerIds, listServiceWorkers} from "./container";
import {createServiceWorkerFetch} from "./execute-fetch";

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

export async function createRouter(): Promise<typeof fetch> {
    const serviceWorkers = await listServiceWorkers();
    const routes = Object.fromEntries(
        await Promise.all(
            serviceWorkers.map(
                async ({ durable: { serviceWorkerId }}) => {
                    return [
                        serviceWorkerId,
                        await listRoutes(serviceWorkerId)
                    ] as const;
                }
            )
        )
    );

    const fetchers = Object.fromEntries(
        serviceWorkers.map(
            serviceWorker => [
                serviceWorker.durable.serviceWorkerId,
                createServiceWorkerFetch(serviceWorker)
            ]
        )
    )

    return async function (input, init) {
        // TODO
        const [first] = Object.values(fetchers);
        return first(input, init);
    }
}