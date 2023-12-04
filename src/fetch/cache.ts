import {
    DurableRequest,
    getKeyValueStore,
    KeyValueStore,
    getDurableRequestStore as getBaseRequestStore,
    RequestQuery, getExpiringStore, deleteDurableRequestBody
} from "../data";
import {ok} from "../is";
import {HeaderList} from "http-header-list";
import {getOrigin} from "../listen/config";
import {getConfig} from "../config";
import {fromDurableRequest, fromDurableResponse, fromRequestResponse} from "../data";
import {Expiring} from "../data/expiring";
import {join} from "node:path";
import {createHash} from "crypto";
import {getInternalStorageBucket, InternalBucket} from "../storage-buckets/internal";

export interface DurableCacheStorageConfig {
    getDurableCacheStorageOrigin?(): string
}

function getDurableCacheStorageOrigin() {
    const config = getConfig();
    return (
        config.getDurableCacheStorageOrigin?.() ??
        getOrigin()
    );
}

async function getRequest(request: RequestQuery, getOrigin?: () => string) {
    if (typeof request === "string" || request instanceof URL) {
        return new Request(
            new URL(
                request,
                getOrigin?.()
            )
        );
    }
    if (request instanceof Request) {
        return request;
    }
    return fromDurableRequest(request, getOrigin);
}

function getRequestQueryURL(requestQuery: RequestQuery, getOrigin?: () => string) {
    if (typeof requestQuery === "string") {
        return new URL(requestQuery, getOrigin?.()).toString();
    }
    if (requestQuery instanceof URL) {
        return requestQuery.toString();
    }
    return requestQuery.url;
}

// https://w3c.github.io/ServiceWorker/#query-cache
function isQueryCacheMatch(requestQuery: RequestQuery | undefined, request: DurableRequest, options?: CacheQueryOptions) {

    return (
        isMethodMatch() &&
        isURLMatch() &&
        isVaryMatch()
    );

    function isMethodMatch() {
        if (options?.ignoreMethod) {
            return true;
        }
        return (
            request.method === "GET" ||
            request.method === "HEAD"
        );
    }

    function isURLMatch() {
        if (!requestQuery) {
            return true;
        }
        const queryUrl = getRequestQueryURL(requestQuery, () => request.url);
        return getCacheURLString(queryUrl, options) === getCacheURLString(request.url, options)
    }

    function isVaryMatch() {
        if (!request.response) {
            return true;
        }

        if (options?.ignoreVary) {
            return true;
        }

        const responseHeaders = new Headers(request.response.headers);
        const vary = responseHeaders.get("Vary");

        if (!vary) {
            return true;
        }

        const requestHeaders = getRequestQueryHeaders(requestQuery);

        if (!requestHeaders) {
            // No headers no match, always matches
            return true;
        }

        const { list } = new HeaderList(vary);

        const values = list.map(({ value }) => value);

        ok(values.length, "Unexpected Vary list")

        for (const name of values) {
            if (name === "*") {
                return false;
            }

            const requestHeader = requestHeaders.get(name);
            const responseHeader = responseHeaders.get(name);

            if (requestHeader !== responseHeader) {
                return false;
            }
        }

        return true;
    }
}

function getCacheURLString(string: string, options?: CacheQueryOptions) {
    const instance = new URL(string);
    if (options?.ignoreSearch) {
        instance.search = "";
    }
    if (instance.hash) {
        instance.hash = "";
    }
    return instance.toString();
}



function getRequestQueryHeaders(requestQuery: RequestQuery) {
    if (typeof requestQuery === "string" || requestQuery instanceof URL) {
        return undefined
    }
    return new Headers(requestQuery.headers);
}

function assertVaryValid(vary: string) {
    if (!vary) {
        return true;
    }
    /*
If innerResponse’s header list contains a header named `Vary`, then:

Let fieldValues be the list containing the items corresponding to the Vary header’s field-values.

For each fieldValue in fieldValues:

If fieldValue matches "*", return a promise rejected with a TypeError.
     */
    const { list } = new HeaderList(vary);
    const wildcard = list.find(({ value }) => value === "*");
    if (wildcard) {
        throw new TypeError(`Unsupported header "Vary: *"`);
    }
}

export interface DurableCacheQueryOptions extends CacheQueryOptions {

}

export interface DurableCacheOptions {
    name: string;
    url(): string;
}

interface DurablePutOperation {
    type: "put"
    request: Request
    response: Response
}

async function fetchPutOperation(info: RequestQuery, init?: Pick<RequestInit, "signal">, getOrigin?: () => string): Promise<DurablePutOperation> {
    const request = await getRequest(info, getOrigin);
    const response = await fetch(request, init);
    return {
        type: "put",
        request,
        response
    }
}

export class DurableCache implements Cache {

    name: string;
    url: () => string;

    constructor({ name, url }: DurableCacheOptions) {
        this.name = name;
        this.url = url;
    }

    async add(info: RequestQuery, init?: Pick<RequestInit, "signal">): Promise<void> {
        const { request, response } = await fetchPutOperation(info, init, this.url);
        return this.put(request, response);
    }

    async addAll(requests: RequestQuery[]): Promise<void> {
        const controller = new AbortController();
        const { signal } = controller;
        try {
            const operations = await Promise.all(
                requests.map(
                    request => fetchPutOperation(
                        request,
                        {
                            signal
                        },
                        this.url
                    )
                )
            );
            await Promise.all(
                operations.map(({ request, response }) => this.put(request, response))
            );
        } catch (error) {
            if (!signal.aborted) {
                controller.abort(error)
            }
            throw error;
        } finally {
            if (!signal.aborted) {
                controller.abort()
            }
        }
    }

    async delete(requestQuery?: RequestQuery, options?: DurableCacheQueryOptions): Promise<boolean> {
        return deleteDurableRequests(this.name, requestQuery, options, this.url);
    }

    async match(requestQuery: RequestQuery, options?: DurableCacheQueryOptions): Promise<Response | undefined> {
        return matchResponse(this.name, requestQuery, options, this.url);
    }

    async matchAll(requestQuery?: RequestQuery, options?: DurableCacheQueryOptions): Promise<ReadonlyArray<Response>> {
        const responses = [];
        for await (const response of matchResponses(this.name, requestQuery, options, this.url)) {
            responses.push(response);
        }
        return responses;
    }

    // https://w3c.github.io/ServiceWorker/#cache-put
    async put(requestQuery: RequestInfo | URL, response: Response): Promise<void> {
        const url = getRequestQueryURL(requestQuery, this.url);

        ok(!response.bodyUsed);
        assertVaryValid(response.headers.get("Vary"));

        const method = getRequestMethod();
        ok(method === "GET" || method === "HEAD", "Requests that aren't GET or HEAD will not be matchable")

        const clonedRequest = new Request(url, {
            method,
            headers: getRequestQueryHeaders(requestQuery)
        });
        const cacheUrl = getBaseCacheURLString(url);
        const { search } = new URL(url);

        const durableRequestIdHash = createHash("sha512");
        durableRequestIdHash.update(search || "?");
        const durableRequestId = durableRequestIdHash.digest().toString("hex");

        const durableRequestData = await fromRequestResponse(
            clonedRequest,
            response,
            {
                fileName: join(CACHE_STORE_NAME, this.name, cacheUrl, durableRequestId),
                persist: true
            }
        );

        const createdAt = new Date().toISOString();

        const durableRequest: DurableRequest = {
            ...durableRequestData,
            durableRequestId,
            createdAt,
            updatedAt: createdAt
        }

        const urlStore = getDurableURLStore(this.name);
        const requestStore = getDurableRequestStore(this.name, cacheUrl);
        await Promise.all([
            urlStore.set(cacheUrl, {
                url: cacheUrl
            }),
            requestStore.set(durableRequestId, durableRequest)
        ]);
        function getRequestMethod() {
            if (typeof requestQuery === "string" || requestQuery instanceof URL) {
                return "GET";
            }
            return requestQuery.method;
        }
    }

    async keys(requestQuery?: RequestInfo | URL, options?: CacheQueryOptions): Promise<ReadonlyArray<Request>> {
        const requests: Request[] = [];
        for await (const durableRequest of matchDurableRequests(this.name, requestQuery, options, this.url)) {
            requests.push(await fromDurableRequest(durableRequest, this.url));
        }
        return requests;
    }

}

async function deleteDurableRequests(cacheName: string, requestQuery?: RequestQuery, options?: DurableCacheQueryOptions, getOrigin?: () => string) {
    let deleted = false;
    const stores = new Map<string, KeyValueStore<DurableRequest>>();
    for await (const durableRequest of matchDurableRequests(cacheName, requestQuery, options, getOrigin)) {
        const url = getRequestQueryURL(durableRequest, getOrigin);
        const cacheUrl = getBaseCacheURLString(url);
        const requestStore = stores.get(cacheUrl) ?? getDurableRequestStore(cacheName, url);
        stores.set(cacheUrl, requestStore);
        await Promise.all([
            requestStore.delete(durableRequest.durableRequestId),
            await deleteDurableRequestBody(durableRequest)
        ]);
        deleted = true;
    }
    const urlStore = getDurableURLStore(cacheName);
    for (const [url, store] of stores.entries()) {
        const keys = await store.keys();
        if (!keys.length) {
            await urlStore.delete(url);
        }
    }
    return deleted;
}

const CACHE_STORE_NAME = "fetch:cache";
const CACHE_REFERENCE_STORE_NAME = "fetch:cacheReference";
const CACHE_URL_STORE_NAME = "fetch:cacheURL";

function getBaseCacheURLString(url: string) {
    return getCacheURLString(url, {
        ignoreSearch: true
    })
}

function getDurableRequestStore(cacheName: string, url: string) {
    return getDurableRequestStoreWithPrefix(`${cacheName}:request:${getBaseCacheURLString(url)}`);
}

function getDurableURLStore(cacheName: string) {
    return getExpiringStore<DurableURLReference>(`${CACHE_URL_STORE_NAME}:${cacheName}`);
}

function getDurableRequestStoreWithPrefix(prefix: string) {
    return getBaseRequestStore({
        name: CACHE_STORE_NAME,
        prefix,
    });
}

interface DurableCacheReference {
    cacheName: string;
    createdAt: string;
    lastOpenedAt: string;
}

interface DurableURLReference extends Expiring {
    url: string;
}

function getDurableCacheReferenceStore(internalBucket: InternalBucket) {
    return internalBucket.getKeyValueStore<DurableCacheReference>(CACHE_REFERENCE_STORE_NAME, {
        counter: false
    });
}

async function firstNext<T>(iterable: AsyncIterable<T>): Promise<IteratorResult<T>> {
    const iterator = iterable[Symbol.asyncIterator]();
    const next = await iterator.next();
    await iterator.return?.();
    return next;
}

async function matchResponse(cacheName: string, requestQuery?: RequestQuery, options?: DurableCacheQueryOptions, getOrigin?: () => string): Promise<Response | undefined> {
    const next = await firstNext(
        matchResponses(cacheName, requestQuery, options, getOrigin)
    );
    return next.value;
}

async function * matchResponses(cacheName: string, requestQuery?: RequestQuery, options?: DurableCacheQueryOptions, getOrigin?: () => string) {
    for await (const { response } of matchDurableRequests(cacheName, requestQuery, options, getOrigin)) {
        if (response) {
            yield await fromDurableResponse(response);
        }
    }
}

async function * matchDurableRequests(cacheName: string, requestQuery?: RequestQuery, options?: DurableCacheQueryOptions, getOrigin?: () => string) {
    if (requestQuery) {
        for await (const request of generateDurableRequestsForUrl(
            getRequestQueryURL(requestQuery, getOrigin)
        )) {
            if (isQueryCacheMatch(requestQuery, request, options)) {
                yield request;
            }
        }
    } else {
        const store = getDurableURLStore(cacheName);
        for (const url of await store.keys()) {
            yield * generateDurableRequestsForUrl(url);
        }
    }

    async function * generateDurableRequestsForUrl(url: string) {
        for await (const request of getDurableRequestStore(cacheName, url)) {
            yield request;
        }
    }

}

export interface DurableCacheStorageOptions {
    url(): string;
    internalBucket?: InternalBucket;
}

export class DurableCacheStorage implements CacheStorage {

    private readonly caches: Map<string, DurableCache>;
    private readonly url: () => string;
    private readonly internalBucket: InternalBucket;

    constructor(options: DurableCacheStorageOptions) {
        this.url = options.url
        this.caches = new Map();
        this.internalBucket = options.internalBucket ?? getInternalStorageBucket();
    }

    async open(cacheName: string): Promise<DurableCache> {
        const existing = this.caches.get(cacheName);
        if (existing) {
            return existing;
        }
        const store = getDurableCacheReferenceStore(this.internalBucket);
        const existingReference = await store.get(cacheName);
        const lastOpenedAt = new Date().toISOString();
        const reference: DurableCacheReference = {
            createdAt: existingReference?.createdAt || lastOpenedAt,
            cacheName,
            lastOpenedAt
        };
        await store.set(cacheName, reference);
        const cache = new DurableCache({
            name: cacheName,
            url: this.url
        });
        this.caches.set(cacheName, cache);
        return cache;
    }

    async has(cacheName: string): Promise<boolean> {
        if (this.caches.has(cacheName)) {
            return true;
        }
        const store = getDurableCacheReferenceStore(this.internalBucket);
        return store.has(cacheName);
    }

    async keys(): Promise<string[]> {
        const store = getDurableCacheReferenceStore(this.internalBucket);
        return await store.keys();
    }

    async delete(cacheName: string): Promise<boolean> {
        if (!(await this.has(cacheName))) {
            return false;
        }
        await deleteDurableRequests(cacheName, undefined, undefined, this.url);
        const store = getDurableCacheReferenceStore(this.internalBucket);
        await store.delete(cacheName);
        this.caches.delete(cacheName);
        return true;
    }

    async match(requestQuery: RequestQuery, options?: MultiCacheQueryOptions): Promise<Response | undefined> {
        for (const cacheName of await this.keys()) {
            const cache = await this.open(cacheName);
            const match = await cache.match(requestQuery, options);
            if (match) {
                return match;
            }
        }
        return undefined;
    }

}

export const caches = new DurableCacheStorage({
    url: getDurableCacheStorageOrigin
});
