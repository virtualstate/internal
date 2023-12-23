import type {DurableServiceWorkerRegistration} from "./container";
import { globalFetch } from "./global-fetch";
import {ServiceWorkerWorkerData} from "./worker";
import {createServiceBindingRouter, getServiceBindingURL} from "./service-router";
import type {WorkerBinding, ServiceEntrypoint, Service} from "./configure";
import {serviceWorker} from "./container";
import {createServiceWorkerFetch, FetchFn} from "./execute-fetch";
import {getImportUrlSourceForService} from "./worker-service-url";
import {dispatchEvent} from "../../events";
import {DurableEventData, fromRequest} from "../../data";

const serviceWorkerContainer = serviceWorker;

export function createServiceWorkerWorkerFetch(data: ServiceWorkerWorkerData, serviceWorker: DurableServiceWorkerRegistration): typeof fetch {
    const { config, service, context } = data;

    if (!(config && service?.bindings)) {
        return globalFetch;
    }

    const router = createServiceBindingRouter(data, serviceWorker);

    const bindingRegistrations = new WeakMap<WorkerBinding, Promise<DurableServiceWorkerRegistration>>();
    const bindingFetchers = new WeakMap<WorkerBinding, Promise<FetchFn>>();

    function getBindingServiceEntrypoint(binding: WorkerBinding) {
        let serviceName = binding.service || binding.protocol || binding.name;
        if (!serviceName) {
            throw new Error("Expected binding to have service name")
        }
        let serviceEntrypoint: ServiceEntrypoint;
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

    function getBindingNamedService(binding: WorkerBinding, serviceEntrypoint = getBindingServiceEntrypoint(binding)) {
        return (
            config.services?.find(service => serviceEntrypoint.name === service.name) ??
            service
        );
    }

    function bindingRegistration(binding: WorkerBinding, namedService?: Service) {
        let promise = bindingRegistrations.get(binding);
        if (!promise) {
            promise = get();
            bindingRegistrations.set(binding, promise);
        }
        return promise;

        async function get() {
            const url = getImportUrlSourceForService(namedService || getBindingNamedService(binding), config);
            return await serviceWorkerContainer.register(url);
        }
    }

    async function createBindingFetch(binding: WorkerBinding) {
        const namedService = getBindingNamedService(binding);
        const registration = await bindingRegistration(binding, namedService);
        return createServiceWorkerFetch(registration, {
            config,
            service: namedService,
            context
        });
    }

    async function bindingFetch(binding: WorkerBinding, input: RequestInfo | URL, init?: RequestInit) {
        let promise = bindingFetchers.get(binding);
        if (!promise) {
            promise = createBindingFetch(binding);
            bindingFetchers.set(binding, promise);
        }
        const fetch = await promise;
        const entrypoint = getBindingServiceEntrypoint(binding);
        return fetch(input, {
            ...init,
            entrypoint: entrypoint.entrypoint,
            entrypointArguments: entrypoint.entrypointArguments
        });
    }

    return async function serviceWorkerFetch(input, init?: RequestInit & { dispatch?: DurableEventData }) {
        const binding = router(input, init);

        if (!binding) {
            return globalFetch(input, init)
        }

        if (binding.service) {
            return bindingFetch(binding, input, init);
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
            const serviceEntrypoint = getBindingServiceEntrypoint(binding);
            const namedService = getBindingNamedService(binding, serviceEntrypoint);
            const registration = await bindingRegistration(binding, namedService);
            const request = new Request(input, init);
            await dispatchEvent({
                type: "fetch",
                serviceWorkerId: registration.durable.serviceWorkerId,
                request: await fromRequest(request, {
                    persist: true // Persist as queue may be out of process
                }),
                dispatch: init.dispatch,
                entrypoint: serviceEntrypoint.entrypoint
            });
            return new Response(null, { status: 204 });
        }

        throw new Error("Unknown or unimplemented worker binding type")
    }
}