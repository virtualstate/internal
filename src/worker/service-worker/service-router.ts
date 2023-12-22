import {ServiceWorkerWorkerData} from "./worker";
import {Config, Service, WorkerBinding} from "./configure/types";
import {DurableServiceWorkerRegistration} from "./container";
import {AddRoutesOptions, isRouteMatchCondition} from "./router";
import {getImportUrlSourceForService} from "./worker-service-url";

export function getServiceBindingURL(input: URL | RequestInfo, service: Service, config: Config) {
    if (input instanceof URL) {
        return input;
    }
    const base = getImportUrlSourceForService(service, config);
    if (typeof input === "string") {
        return new URL(input, base);
    }
    return new URL(input.url, base);
}

export function createServiceBindingRouter({ config, service }: ServiceWorkerWorkerData, serviceWorker: DurableServiceWorkerRegistration) {

    const protocolBindings = service.bindings?.filter(binding => binding.protocol);
    const nonProtocolBindings = service.bindings?.filter(binding => !binding.protocol);

    return (input: RequestInfo | URL, init?: RequestInit): WorkerBinding | undefined => {

        if (!service.bindings?.length) {
            return undefined;
        }

        try {
            const url = getServiceBindingURL(input, service, config);

            return (
                match(protocolBindings) ||
                match(nonProtocolBindings)
            );

            function match(bindings: WorkerBinding[]) {
                for (const binding of bindings) {
                    if (isServiceMatchCondition(serviceWorker, config, service, binding, url, input, init)) {
                        return binding;
                    }
                }
                return undefined;
            }

        } catch (error) {
            console.error("Match error", error, input, service, config);
            return undefined;
        }

    }
}

function isServiceProtocolMatch(binding: WorkerBinding, url: URL) {
    return (
        !binding.protocol ||
        binding.protocol === url.protocol ||
        (
            !binding.protocol.endsWith(":") &&
            `${binding.protocol}:` === url.protocol
        )
    )
}

export function isServiceMatchCondition(serviceWorker: DurableServiceWorkerRegistration, config: Config, service: Service, binding: WorkerBinding, url: URL, input: RequestInfo | URL, init?: RequestInit) {
    if (binding.protocol) {
        return isServiceProtocolMatch(binding, url);
    }

    if (binding.routes) {
        return isRoutesMatchCondition(serviceWorker, binding.routes, input, init);
    }

    if (binding.name) {
        return getServiceBindingURL(binding.name, service, config).toString() !== url.toString();
    }

    return false
}

function isRoutesMatchCondition(serviceWorker: DurableServiceWorkerRegistration, routes: AddRoutesOptions, input: RequestInfo | URL, init?: RequestInit) {
    if (Array.isArray(routes)) {
        for (const route of routes) {
            if (isRouteMatchCondition(serviceWorker, route, input, init)) {
                return
            }
        }
        return false;
    } else {
        return isRouteMatchCondition(serviceWorker, routes, input, init);
    }
}