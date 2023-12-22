import type {DurableServiceWorkerRegistration} from "./container";
import { globalFetch } from "./global-fetch";
import {ServiceWorkerWorkerData} from "./worker";
import {createServiceBindingRouter, getServiceBindingURL} from "./service-router";
import {NamedService, WorkerBinding, ServiceEntrypoint} from "./configure/types";
import {serviceWorker} from "./container";
import {createServiceWorkerFetch, FetchFn} from "./execute-fetch";
import {getImportUrlSourceForService} from "./worker-service-url";

const serviceWorkerContainer = serviceWorker;

export function createServiceWorkerWorkerFetch(data: ServiceWorkerWorkerData, serviceWorker: DurableServiceWorkerRegistration): typeof fetch {
    const { config, service, context } = data;

    if (!(config && service?.bindings)) {
        return globalFetch;
    }

    const router = createServiceBindingRouter(data, serviceWorker);

    const bindingFetchers = new WeakMap<WorkerBinding, Promise<FetchFn>>();

    async function createBindingFetch(binding: WorkerBinding) {
        let serviceName = binding.service || binding.protocol || binding.name;
        if (!serviceName) {
            throw new Error("Expected binding to have service name")
        }
        let serviceEntrypoint: ServiceEntrypoint | NamedService;
        if (typeof serviceName === "string") {
            serviceEntrypoint = config.services?.find(service => service.name === serviceName)
        } else {
            serviceEntrypoint = serviceName;
        }
        if (!serviceEntrypoint) {
            throw new Error(`Unknown service name ${serviceName}`)
        }
        const namedService = (
            config.services?.find(service => serviceEntrypoint.name === service.name) ??
            service
        );
        const url = getImportUrlSourceForService(namedService, config);
        const registration = await serviceWorkerContainer.register(url);
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
        return fetch(input, init);
    }

    return async function serviceWorkerFetch(input, init) {
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

        throw new Error("Unknown or unimplemented worker binding type")
    }
}