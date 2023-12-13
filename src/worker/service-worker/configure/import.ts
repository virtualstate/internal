import {Config, Socket, Service, ServiceEntrypointOption} from "./types";
import {isLike, ok} from "../../../is";
import {SERVICE_WORKER_LISTEN_HOSTNAME} from "../../../config";
import {DurableServiceWorkerRegistration, serviceWorker} from "../container";
import process from "node:process";
import {join} from "node:path";
import {createServiceWorkerWorker} from "../execute";
import {DurableEventData, fromDurableResponse} from "../../../data";
import {listen} from "../start";
import {FetchResponseMessage} from "../dispatch";

async function importConfigModule(url: string) {
    const configModule = await import(url);

    if (isLike<{ config?: Config }>(configModule) && configModule.config) {
        return configModule.config
    } else if (isLike<{ default?: Config }>(configModule) && configModule.default) {
        return configModule.default;
    }

    throw new Error(`Expected config to exported as default or named export "config" from ${url}, got keys ${Object.keys(configModule)}`)
}

interface ServiceWorkerEventFn {
    (event: DurableEventData): Promise<unknown>
}

interface ServiceWorkerContext {
    registration: DurableServiceWorkerRegistration;
    activated: Promise<ServiceWorkerEventFn>
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
        namedServices[idOrName] = initialiseService(options);
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

    function getImportUrlSourceForService(service: Service) {
        if (!service.url) {
            // TODO search for files async
            return join(process.cwd(), "index.js");
        }
        if (!Array.isArray(service.url)) {
            return service.url.toString();
        }
        const [first] = service.url;
        ok(first, "Expected at least one url to import for service");
        return first.toString();
    }

    async function initialiseService(service: Service) {
        const url = getImportUrlSourceForService(service);
        const registration = await serviceWorker.register(url)
        const context: ServiceWorkerContext = {
            registration,
            activated: activateService(registration)
        }
        const contextPromise = Promise.resolve(context);
        namedServices[registration.durable.serviceWorkerId] = contextPromise;
        if (service.name) {
            namedServices[service.name] = contextPromise;
        }
        return context;
    }

    async function activateService(registration: DurableServiceWorkerRegistration) {
        const worker = await createServiceWorkerWorker();
        await worker.push({
            serviceWorkerId: registration.durable.serviceWorkerId
        });
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
        const url = getImportUrlSourceForService(parsed);
        return getService(url, parsed);
    }
}

/**
 * Import configuration and initiate services
 */
export async function importConfiguration(url: string) {
    const config = await importConfigModule(url);
    const services = await initialiseServices(config);

    if (config.sockets?.length) {
        await Promise.all(
            config.sockets.map(
                socket => initialiseSocket(socket, services)
            )
        );
    }

    return services;
}

async function initialiseSocket(socket: Socket, getService: ServiceFn) {

    ok(socket.address.includes(":"), "Expected address in the format \"host:port\", e.g \"*:8080\"")
    let [hostname, port] = socket.address.split(":");

    if (hostname === "*") {
        hostname = SERVICE_WORKER_LISTEN_HOSTNAME || "localhost";
    }

    const service = await getService(socket.service);

    const dispatch = await service.activated;

    async function fetchDispatch(event: DurableEventData) {
        const { handled, respondWith, signal, ...rest } = event;
        ok(typeof respondWith === "function");
        const returned = await dispatch(rest);
        ok<FetchResponseMessage>(returned);

        if (returned.response) {
            respondWith(await fromDurableResponse(returned.response));
        }

        return { type: "service:listener:fetch:handled", returned }
    }

    async function variableDispatch(event: DurableEventData): Promise<DurableEventData> {
        if (event.type === "fetch") {
            return fetchDispatch(event);
        } else {
            await dispatch(event);
        }
        return { type: "service:listener:handled" }
    }

    await listen({
        id: service.registration.durable.serviceWorkerId,
        url: service.registration.durable.url,
        listen: {
            port,
            hostname,
        },
    }, variableDispatch);
}