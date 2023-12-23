import {Config, Socket, Service, ServiceEntrypointOption} from "./types";
import {isLike, ok} from "../../../is";
import {SERVICE_WORKER_LISTEN_HOSTNAME} from "../../../config";
import {DurableServiceWorkerRegistration, serviceWorker} from "../container";
import {createServiceWorkerWorker, Pushable} from "../execute";
import {DurableEventData, fromDurableResponse, fromRequest, fromRequestWithSourceBody} from "../../../data";
import {listen} from "../start";
import {FetchResponseMessage} from "../dispatch";
import {getImportUrlSourceForService} from "../worker-service-url";
import {
    createServiceWorkerFetch,
    executeServiceWorkerFetch,
    executeServiceWorkerFetchEvent,
    FetchFn, FetchInit
} from "../execute-fetch";
import {getURLSource} from "../url";
import {getOrigin} from "../../../listen";
import {isRouteMatchCondition} from "../router";
import {ServiceWorkerWorkerData} from "../worker";

async function importConfigModule(url: string | URL) {
    const instance = url instanceof URL ? url : new URL(url, "file:///");
    const configModule = await import(url.toString(), {
        assert: instance.pathname.endsWith(".json") ? {
            type: "json"
        } : undefined
    });
    if (isLike<{ config?: Config }>(configModule) && configModule.config) {
        return configModule.config
    } else if (isLike<{ default?: Config }>(configModule) && configModule.default) {
        return configModule.default;
    }
    const keys = Object.keys(configModule);
    throw new Error(`Expected config to exported as default or named export "config" from ${url}, got keys ${keys}`)
}

interface ServiceWorkerEventFn {
    (event: DurableEventData): Promise<unknown>
}

interface ServiceWorkerContext {
    pushable: Pushable<ServiceWorkerWorkerData, unknown>;
    service: Service;
    registration: DurableServiceWorkerRegistration;
    activated: Promise<ServiceWorkerEventFn>;
    fetch: FetchFn;
}

interface ServiceFn {
    (service?: ServiceEntrypointOption): Promise<ServiceWorkerContext>;
}



async function initialiseServices(config: Config) {
    const namedServices: Record<string, Promise<ServiceWorkerContext>> = {};

    function getService(idOrName: string, options: Service) {
        const existing = namedServices[idOrName];
        if (existing) {
            return existing;
        }
        return namedServices[idOrName] = initialiseService(options);
    }

    function findServiceConfig(name: string) {
        return config.services?.find(service => service.name === name);
    }

    function parseOptions(options?: ServiceEntrypointOption) {
        if (!options) {
            return {
                name: "DEFAULT_SERVICE_WORKER__"
            }
        }
        if (typeof options === "string") {
            const found = findServiceConfig(options);
            ok(found, `Expected to find service ${options}`);
            return found;
        }
        if (options.name) {
            const found = findServiceConfig(options.name);
            if (found) {
                return found;
            }
        }
        return options;
    }

    async function initialiseService(service: Service) {
        const url = getImportUrlSourceForService(service, config);
        const registration = await serviceWorker.register(url)
        const pushable = await createServiceWorkerWorker();
        const context: ServiceWorkerContext = {
            pushable,
            service,
            registration,
            activated: activateService(registration, service, pushable),
            fetch: createServiceWorkerFetch(registration, {
                config,
                service
            }, pushable)
        }
        const contextPromise = Promise.resolve(context);
        namedServices[registration.durable.serviceWorkerId] = contextPromise;
        if (service.name) {
            namedServices[service.name] = contextPromise;
        }
        return context;
    }

    async function activateService(registration: DurableServiceWorkerRegistration, service: Service, worker: Pushable<ServiceWorkerWorkerData, unknown>) {
        if (!registration.active) {
            await worker.push({
                serviceWorkerId: registration.durable.serviceWorkerId,
                config,
                service
            });
        }
        let queue: Promise<void> | undefined = undefined;
        return async (event: DurableEventData) => {
            // TODO multiply worker if if progress instead of a queue which can lock
            let promise;
            if (queue) {
                promise = queue.then(push);
            } else {
                promise = push();
            }
            queue = promise.then(() => void 0, () => void 0);
            return promise;
            function push() {
                return worker.push({
                    serviceWorkerId: registration.durable.serviceWorkerId,
                    event
                })
            }
        }
    }

    return async (options?: ServiceEntrypointOption): Promise<ServiceWorkerContext> => {
        const parsed = parseOptions(options);
        if (parsed.name) {
            return getService(parsed.name, parsed);
        }
        const url = getImportUrlSourceForService(parsed, config);
        return getService(url, parsed);
    }
}

export interface ImportConfigurationOptions {
    virtual?: boolean;
}

/**
 * Import configuration and initiate services
 */
export async function importConfiguration(source: string | URL | Config, { virtual }: ImportConfigurationOptions = {}) {
    let config: Config;
    if (typeof source === "string" || source instanceof URL) {
        config = await importConfigModule(source);
        config.url = new URL(source, "file://").toString();
    } else {
        config = source;
        ok(config.url, "Must give base url for config if provided directly");
    }
    const getService = await initialiseServices(config);

    const fetch = createSocketFetch(config, getService);

    let closeFns: (() => Promise<void>)[] = [];

    if (!virtual && config.sockets?.length) {
        closeFns = await Promise.all(
            config.sockets.map(
                socket => initialiseSocket(config, socket, getService)
            )
        );
    }

    return {
        fetch,
        getService,
        async close() {
            if (closeFns.length) {
                await Promise.all(closeFns.map(async fn => fn()))
            }
            closeFns = [];
        }
    };
}

function createSocketFetch(config: Config, getService: ServiceFn): FetchFn {
    return async (input, init) => {
        const urlSource = getURLSource(input)
        const socket = config.sockets?.find(socket => {
            const [hostname, port] = socket.address.split(":");
            const url = new URL(urlSource, `${socket.type || "http"}://${hostname === "*" ? "localhost" : hostname}${port === "*" ? "" : `:${port}`}`);
            if (! (
                (hostname === "*" || url.hostname === hostname) &&
                (port === "*" || url.port === port)
            )) {
                return false;
            }
            if (Array.isArray(socket.routes)) {
                for (const route of socket.routes) {
                    if (isRouteMatchCondition(
                        {
                            baseURL: url.origin
                        },
                        route,
                        input,
                        init
                    )) {
                        return true;
                    }
                }
                return false;
            } else if (socket.routes) {
                return isRouteMatchCondition(
                    {
                        baseURL: url.origin
                    },
                    socket.routes,
                    input,
                    init
                );
            } else {
                return true;
            }
        });
        if (!socket) {
            throw new Error("Unknown address")
        }
        const service = await getService(socket.service);
        await service.activated;
        return service.fetch(input, init);
    }
}

async function initialiseSocket(config: Config, socket: Socket, getService: ServiceFn) {

    ok(socket.address.includes(":"), "Expected address in the format \"host:port\", e.g \"*:8080\"")
    let [hostname, port] = socket.address.split(":");

    if (hostname === "*") {
        hostname = SERVICE_WORKER_LISTEN_HOSTNAME || "localhost";
    }

    const service = await getService(socket.service);


    async function fetchDispatch(event: DurableEventData) {
        const { handled, respondWith, signal, request, ...rest } = event;
        ok(typeof respondWith === "function");
        ok(request instanceof Request);

        respondWith(executeServiceWorkerFetchEvent(service.registration, {
            ...rest,
            type: "fetch",
            request: fromRequestWithSourceBody(request),
            virtual: true
        }, {
            config,
            service: service.service
        }))

        // ok(typeof respondWith === "function");
        // ok(request instanceof Request);
        // const returned = await dispatch({
        //     ...rest,
        //     request: fromRequestWithSourceBody(request)
        // });
        // console.log(returned);
        // ok<FetchResponseMessage>(returned);
        //
        // if (returned.response) {
        //     respondWith(await fromDurableResponse(returned.response));
        // }

        return { type: "service:listener:fetch:handled" }
    }

    async function variableDispatch(event: DurableEventData): Promise<DurableEventData> {
        if (event.type === "fetch") {
            return fetchDispatch(event);
        } else {
            const dispatch = await service.activated;
            await dispatch(event);
        }
        return { type: "service:listener:handled" }
    }

    return await listen({
        id: service.registration.durable.serviceWorkerId,
        url: service.registration.durable.url,
        listen: {
            port,
            hostname,
        },
    }, variableDispatch);
}