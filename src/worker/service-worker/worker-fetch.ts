import type {DurableServiceWorkerRegistration} from "./container";
import { globalFetch } from "./global-fetch";
import {ServiceWorkerWorkerData} from "./worker";
import {createServiceBindingRouter, getServiceBindingURL} from "./service-router";
import type {WorkerBinding, Service, Config} from "./configure";
import {serviceWorker} from "./container";
import {createServiceWorkerFetch, FetchFn} from "./execute-fetch";
import {getImportUrlSourceForService} from "./worker-service-url";
import {dispatchEvent} from "../../events";
import {DurableEventData, fromRequest} from "../../data";
import {fetchServiceWorkerSource, isRouterSourceType} from "./router";
import {named} from "@virtualstate/kdl";

const serviceWorkerContainer = serviceWorker;



const bindingRegistrations = new WeakMap<WorkerBinding, Promise<DurableServiceWorkerRegistration>>();
const bindingFetchers = new WeakMap<WorkerBinding, Promise<FetchFn>>();

export function getBindingServiceEntrypoint(config: Config, binding: WorkerBinding) {
    let serviceName = binding.service || binding.protocol || binding.queue || binding.name;
    if (!serviceName) {
        throw new Error("Expected binding to have service name")
    }
    let serviceEntrypoint: Service;
    if (typeof serviceName === "string") {
        serviceEntrypoint = config.services?.find(service => service.name === serviceName)
    } else {
        serviceEntrypoint = serviceName;
    }
    if (!serviceEntrypoint) {
        throw new Error(`Unknown service name ${serviceName}`)
    }
    return serviceEntrypoint;
}

export function getBindingNamedService(config: Config, binding: WorkerBinding, serviceEntrypoint = getBindingServiceEntrypoint(config, binding)) {
    if (!serviceEntrypoint.name) {
        return serviceEntrypoint;
    }
    return (
        config.services?.find(service => serviceEntrypoint.name === service.name) ??
        serviceEntrypoint
    );
}

export function bindingRegistration(config: Config, binding: WorkerBinding, namedService?: Service) {
    let promise = bindingRegistrations.get(binding);
    if (!promise) {
        promise = get();
        bindingRegistrations.set(binding, promise);
    }
    return promise;

    async function get() {
        const service = namedService || getBindingNamedService(config, binding);
        const url = getImportUrlSourceForService(service, config);
        return await serviceWorkerContainer.register(url, {
            config,
            service
        });
    }
}

export async function createBindingFetch(config: Config, binding: WorkerBinding, context?: Record<string, unknown[]>) {
    const namedService = getBindingNamedService(config, binding);
    const registration = await bindingRegistration(config, binding, namedService);
    if (namedService.source) {
        const source = namedService.source;
        const fn: FetchFn = async (input, init) => fetchServiceWorkerSource({
            input,
            init,
            registration,
            route: {
                condition: undefined,
                source
            }
        });
        return fn;
    } else {
        return createServiceWorkerFetch(registration, {
            config,
            service: namedService,
            context
        });
    }
}

export async function bindingFetch(config: Config, binding: WorkerBinding, context: Record<string, unknown[]> | undefined, input: RequestInfo | URL, init?: RequestInit) {
    const entrypoint = getBindingServiceEntrypoint(config, binding);
    let promise = bindingFetchers.get(binding);
    if (!promise) {
        promise = createBindingFetch(config, binding, context);
        bindingFetchers.set(binding, promise);
    }
    const fetch = await promise;
    return fetch(input, {
        ...init,
        entrypoint: entrypoint.entrypoint,
        entrypointArguments: entrypoint.entrypointArguments
    });
}

export function createServiceWorkerWorkerFetch(data: ServiceWorkerWorkerData, serviceWorker: DurableServiceWorkerRegistration): typeof fetch {
    const { config, service, context } = data;

    if (!(config?.bindings?.length || service?.bindings?.length)) {
        return globalFetch;
    }

    const router = createServiceBindingRouter(data, serviceWorker);

    return async function serviceWorkerFetch(input, init?: RequestInit & { dispatch?: DurableEventData }) {
        const binding = router(input, init);

        if (!binding) {
            const globalOutbound = service.globalOutbound || "internet";
            const internetBinding = binding || { name: globalOutbound, service: globalOutbound }
            const internet = getBindingNamedService(config, internetBinding, internetBinding);
            // If we get back the binding we passed, then the service didn't exist
            // If the internet service does not exist, we will use global
            if (internet === internetBinding) {
                return globalFetch(input, init)
            }
            return bindingFetch(config, internetBinding, context, input, init);
        }

        if (binding.service) {
            return bindingFetch(config, binding, context, input, init);
        }

        if (binding.json) {
            return new Response(
                JSON.stringify(binding.json),
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        }

        if (binding.data) {
            return new Response(binding.data);
        }

        if (binding.text) {
            return new Response(binding.text);
        }

        if (binding.import) {
            const imported: { default: unknown } = await import(getServiceBindingURL(binding.import, service, config).toString(), {
                assert: binding.assert
            });
            // TODO elsewhere make live if imported as module
            // This is if fetch was used, e.g. fetch(`file:///worker.js`) if the worker was at file:///worker.js,
            // this should return itself
            new Response(
                JSON.stringify(imported.default),
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
        }

        if (binding.queue) {
            const serviceEntrypoint = getBindingServiceEntrypoint(config, binding);
            const namedService = getBindingNamedService(config, binding, serviceEntrypoint);
            const registration = await bindingRegistration(config, binding, namedService);
            const request = new Request(input, init);
            await dispatchEvent({
                type: "fetch",
                serviceWorkerId: registration.durable.serviceWorkerId,
                request: await fromRequest(request, {
                    persist: true // Persist as queue may be out of process
                }),
                dispatch: init.dispatch,
                entrypoint: serviceEntrypoint.entrypoint,
                entrypointArguments: serviceEntrypoint.entrypointArguments,
                virtual: true
            });
            return new Response(null, { status: 204 });
        }

        if (binding.fromEnvironment) {
            return new Response(process.env[binding.fromEnvironment]);
        }

        if (binding.name) {
            // Name only binding
            return bindingFetch(config, binding, context, input, init);
        }

        throw new Error("Unknown or unimplemented worker binding type")
    }
}