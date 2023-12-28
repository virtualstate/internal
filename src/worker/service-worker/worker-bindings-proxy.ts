import {FetchFn} from "./execute-fetch";
import {Config, Service, WorkerBinding} from "./configure";
import {bindingFetch} from "./worker-fetch";
import {ok} from "../../is";
import {ServiceWorkerWorkerData} from "./worker";

export class NamedServiceWorkerBindingsProxy implements Record<string, unknown> {

    readonly #config: Config;
    readonly #binding: WorkerBinding;

    [x: string]: unknown;

    constructor(binding: WorkerBinding, options: ServiceWorkerBindingsProxyOptions) {
        this.#config = options.config;
        this.#binding = binding;
        const that = this;
        const named: Record<string, (json: unknown) => unknown> = {};
        return new Proxy<NamedServiceWorkerBindingsProxy>(this, {
            get(target: unknown, p: string | symbol): any {
                if (typeof p !== "string") {
                    return;
                }
                if (p === "fetch") {
                    return that.fetch.bind(that);
                }
                const fn = named[p];
                if (fn) {
                    return fn;
                }
                // TODO validate that this is fine
                return named[p] = async (json: unknown) => {
                    const response = await that.fetch(p, {
                        method: "POST",
                        body: JSON.stringify(json),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    ok(response.ok, `Received response status ${response.status} for ${p}`);
                    return response.json();
                }
            }
        })
    }

    fetch: FetchFn = async (input, init) => {
        return bindingFetch(this.#config, this.#binding, undefined, input, init);
    }

}

export interface ServiceWorkerBindingsProxyOptions {
    config: Config;
    service: Service;
}

function getServiceWorkerBindingValue(options: ServiceWorkerBindingsProxyOptions, binding: WorkerBinding) {
    if (binding.json) {
        return binding.json;
    } else if (binding.text) {
        return binding.text;
    } else if (binding.data) {
        return binding.data;
    } else if (binding.import) {
        const url = binding.import.toString();
        let imported: Record<string, unknown>;
        return async function importBinding() {
            imported = imported ?? await import(url, {
                assert: binding.assert
            });
            // TODO maybe binding.entrypoint?
            return imported.default;
        }
    } else if (binding.fromEnvironment) {
        return process.env[binding.fromEnvironment] ?? null;
    }
    return new NamedServiceWorkerBindingsProxy(binding, options);
}

export function createMaybeServiceWorkerBindingsProxy(data: ServiceWorkerWorkerData) {
    if (data.config && data.service) {
        return new ServiceWorkerBindingsProxy({
            config: data.config,
            service: data.service
        })
    }
    return undefined;
}

export class ServiceWorkerBindingsProxy implements Record<string, unknown> {

    [x: string]: unknown;

    constructor(options: ServiceWorkerBindingsProxyOptions) {
        const named: Record<string | symbol, { bind: unknown }> = {}

        return new Proxy<ServiceWorkerBindingsProxy>(this, {
            get(target: unknown, p: string | symbol): any {
                if (typeof p !== "string") {
                    return;
                }
                const existing = named[p];
                if (existing) {
                    return existing.bind;
                }
                const binding = (
                    options.service.bindings?.find(binding => binding.name === p) ||
                    options.config.bindings?.find(binding => binding.name === p)
                );
                if (!binding) {
                    // Mark as null
                    named[p] = { bind: null };
                } else {
                    named[p] = {
                        bind: getServiceWorkerBindingValue(options, binding)
                    };
                }
                return named[p].bind;
            }
        })
    }

}