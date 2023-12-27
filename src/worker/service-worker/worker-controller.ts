import {FetchFn} from "./execute-fetch";
import {Config, Service, WorkerBinding} from "./configure";
import {bindingFetch} from "./worker-fetch";
import {ok} from "../../is";

export class NamedServiceWorkerController implements Record<string, (...args: unknown[]) => Promise<unknown | void> | unknown> {

    readonly #config: Config;
    readonly #binding: WorkerBinding;

    [x: string]: (...args: unknown[]) => Promise<unknown | void> | unknown;
    constructor(name: string, options: ServiceWorkerControllerOptions) {
        this.#config = options.config;
        this.#binding = (
            options.service.bindings?.find(binding => binding.name === name) ||
            options.config.bindings?.find(binding => binding.name === name)
        );
        const that = this;
        const named: Record<string, (json: unknown) => unknown> = {};
        return new Proxy<NamedServiceWorkerController>(this, {
            get(target: unknown, p: string | symbol): any {
                if (typeof p !== "string") {
                    return;
                }
                if (p === "fetch") {
                    return that.fetch;
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

export interface ServiceWorkerControllerOptions {
    config: Config;
    service: Service;
}

export class ServiceWorkerController implements Record<string, NamedServiceWorkerController> {

    [x: string]: NamedServiceWorkerController;

    constructor(options: ServiceWorkerControllerOptions) {
        const named: Record<string | symbol, NamedServiceWorkerController> = {};
        return new Proxy<ServiceWorkerController>(this, {
            get(target: unknown, p: string | symbol): any {
                if (typeof p !== "string") {
                    return;
                }
                let controller = named[p];
                if (!controller) {
                    controller = new NamedServiceWorkerController(p, options);
                    named[p] = controller;
                }
                return controller;
            }
        })
    }

}