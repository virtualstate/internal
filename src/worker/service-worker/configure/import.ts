import {Config, Socket, Service, ServiceEntrypointOption, NamedService, SocketType, WorkerBinding} from "./types";
import {isLike, ok} from "../../../is";
import {SERVICE_WORKER_LISTEN_HOSTNAME} from "../../../config";
import {DurableServiceWorkerRegistration, serviceWorker} from "../container";
import {createServiceWorkerWorker, Pushable} from "../execute";
import {DurableEventData, fromDurableResponse, fromRequest, fromRequestWithSourceBody} from "../../../data";
import {listen} from "../start";
import {FetchResponseMessage} from "../dispatch";
import {getImportUrlSourceForService, getMaybeFunctionURL} from "../worker-service-url";
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
import {readFile} from "fs/promises";
import type { SyntaxNode } from "tree-sitter";
import {getServiceBindingURL} from "../service-router";
import {fileURLToPath} from "node:url";
import {dirname} from "path";

async function getURL(url: URL) {
    if (url.protocol === "file:") {
        return await readFile(url.pathname, "utf-8");
    }
    const response = await fetch(url);
    ok(response.ok, "Could not fetch config")
    return response.text();
}

async function parseCapnp(url: URL) {
    const source = await getURL(url);

    const { default: Parser } = await import("tree-sitter");
    const { default: Capnp } = await import("tree-sitter-capnp");
    const parser = new Parser();
    parser.setLanguage(Capnp);
    const tree = parser.parse(source);

    const typed: Record<string, Record<string, SyntaxNode>> = {};
    const references: Record<string, SyntaxNode> = {};

    for (const constant of tree.rootNode.children.filter(node => node.type === "const")) {
        const identifier = constant.children.find(({ type }) => type === "const_identifier");
        const type = constant.children.find(({ type }) => type === "field_type");
        const value = constant.children.find(({ type }) => type === "const_value");
        const typeRecord = typed[type.text] || {}
        typeRecord[identifier.text] = value;
        references[identifier.text] = value;
        typed[type.text] = typeRecord;
    }
    const typeKeys = Object.keys(typed);
    // Any namespace can be used for the config.
    const configType = typeKeys.find(key => key.endsWith(".Config"));
    const configs = Object.keys(typed[configType] || {});

    if (configs.length !== 1) {
        throw new Error(`Expected a single config of type "${configType}", got ${configs.length}: ${configs.join(", ")}`)
    }

    const [configKey] = configs;
    const configNode = typed[configType][configKey];

    const config: Config = {
        url: url.toString(),
        services: [],
        sockets: [],
        bindings: [],
    };

    function parseValue(node: SyntaxNode): unknown {
        // console.log(node.type, node.text);
        if (node.type === "struct_shorthand") {
            return parseRecord(node);
        } else if (node.type === "const_value") {
            const [child] = node.children;
            return parseValue(child);
        } else if (node.type === "const_list") {
            return parseArray(node);
        } else if (node.type === "string") {
            return JSON.parse(node.text);
        } else if (node.type === "number" || node.type === "float" || node.type === "integer") {
            return Number(node.text);
        } else if (node.type === "boolean") {
            return Boolean(node.text);
        } else if (node.type === ".") {
            return parseReference(node);
        } else if (node.type === "embedded_file") {
            return parseURL(node);
        } else if (node.type === "const_identifier") {
            const referenced = references[node.text];
            if (referenced) {
                return parseValue(referenced);
            } else {
                return node.text;
            }
        } else {
            console.log(node, node.type, node.text, node.typeId);
            console.warn(`Unknown type ${node.type}`);
        }
    }

    function parseURL(node: SyntaxNode) {
        const [typeNode, valueNode] = node.children;
        ok(typeNode.type === "embed", "Expected type embed");
        ok(valueNode, "Expected value node");
        return parseValue(valueNode);
    }

    function parseReference(node: SyntaxNode) {
        const localNode = node.nextSibling;
        ok(localNode.type === "local_const", "Expected local_const");
        const name = localNode.text;
        return parseValue(references[name]);
    }

    function parseArray(node: SyntaxNode) {
        return node.children
            .filter(node => node.type === "const_value")
            .map(parseValue);
    }

    function parseRecord(node: SyntaxNode) {
        const record: Record<string, unknown> = {}
        for (const property of node.children.filter(node => node.type === "property")) {
            const value = property.nextSibling.nextSibling;
            record[property.text] = parseValue(value);
        }
        return record;
    }

    // Sorry any
    const parsed: any = parseValue(configNode);

    const directory = dirname(url.pathname);

    function parseBindings(bindings: any[]): WorkerBinding[] {
        return bindings.map(binding => {
            const next: WorkerBinding = {
                ...binding,
                name: binding.name
            }
            if (typeof next.service === "string") {
                next.service = {
                    name: next.service
                }
            }
            if (next.service) {
                if (!next.service.entrypoint) {
                    next.service.entrypoint = "fetch"
                }
                if (!next.service.entrypointArguments) {
                    next.service.entrypointArguments = [
                        "request",
                        "bindings",
                        "$event"
                    ]
                }
            }
            return next;
        })
    }

    if (Array.isArray(parsed.services)) {
        const inherit: [string, NamedService][] = [];

        for (const service of parsed.services) {
            const next: NamedService = {
                ...service,
                name: service.name,
                bindings: [],
            };
            let isInherit = false;
            if (service.worker) {
                console.log(service.worker)
                if (Array.isArray(service.worker.modules)) {
                    next.url = await Promise.all(
                        service.worker.modules.map(
                            async (module: Record<string, string>) => {
                                if (module.esModule) {
                                    return module.esModule;
                                }
                                if (module.commonJsModule) {
                                    return module.commonJsModule;
                                }
                                if (module.text) {
                                    return `data:text/javascript,${encodeURIComponent(`
                                export default ${JSON.stringify(module.text)}
                                `)}`
                                }
                                if (module.json) {
                                    return `data:text/javascript,${encodeURIComponent(`
                                export default ${module.json}
                                `)}`
                                }
                                if (module.nodeJsCompatModule) {
                                    return module.nodeJsCompatModule;
                                }
                                if (typeof module.wasm === "string") {
                                    return module.wasm;
                                }
                                if (module.data) {
                                    const url = getServiceBindingURL(
                                        module.data,
                                        next,
                                        config
                                    )
                                    const data = await getURL(url);
                                    return `data:text/javascript,${encodeURIComponent(`
                                export default Buffer.from(${JSON.stringify(data)}, "utf-8")
                                `)}`
                                }
                                throw new Error("Unknown or unimplemented service import type");
                            }
                        )
                    );
                } else if (service.worker.serviceWorkerScript) {
                    next.url = service.worker.serviceWorkerScript;
                } else if (service.worker.inherit) {
                    isInherit = true;
                }
                if (Array.isArray(service.worker.bindings)) {
                    next.bindings.push(...parseBindings(service.worker.bindings));
                }
            } else if (service.network) {
                // TODO disallow/allow network based on given rules
                next.source = {
                    type: "network"
                };
            } else if (service.external) {
                const { address, http, https } = service.external;
                const url = new URL(`${http ? "http" : "https"}://${address}`).toString();
                next.url = `data:text/javascript,${encodeURIComponent(`
                const { origin } = new URL(${JSON.stringify(url)});
                export default {
                  async fetch(request) {
                    const url = new URL(request.url);
                    const forwardedProto = url.protocol.replace(/:$/, "");
                    const forwardedHost = url.host;
                    url.origin = origin;
                    const cloned = request.clone()
                    const headers = new Headers(cloned.headers);
                    headers.set("X-Forwarded-Proto", headers.get("X-Forwarded-Proto") || forwardedProto);
                    headers.set("X-Forwarded-Host", headers.get("X-Forwarded-Host") || forwardedHost);
                    return fetch(new Request(url, {
                        method: request.method,
                        body: cloned.body,
                        headers
                    }));
                  }
                }
                `)}`
            } else if (service.disk) {
                next.url = `data:text/javascript,${encodeURIComponent(`
                import { createWriteStream, createReadStream } from "node:fs";
                import { stat, readdir } from "node:fs/promises";
                import { Readable } from "node:stream";
                import { ReadableStream } from "node:stream/web";
                import { finished } from "node:stream/promises";
                import process from "node:process";
                import { join } from "node:path";
                const cwd = join(${JSON.stringify(directory)}, ${JSON.stringify(service.disk)});
                export default {
                  async fetch(request) {
                    const method = request.method.toLowerCase();
                    const { pathname } = new URL(request.url);
                    if (pathname.includes("..")) throw new Error("Unexpected double dot used in pathname");
                    const path = join(cwd, "." + pathname);
                    console.log({ path, method });
                    if (method === "put") {
                        const fileStream = createWriteStream(path, { flags: "wx" });
                        await finished(Readable.fromWeb(res.body).pipe(fileStream));
                        return new Response(null, { status: 204 });
                    }
                    let pathStat;
                    try {
                      pathStat = await stat(path);
                      if (!pathStat.isFile()) {
                         if (pathStat.isDirectory()) {
                           const directory = await readdir(path)
                           return Response.json(directory);
                         }
                         return new Response(null, { status: 404 });
                      }
                    } catch {
                      return new Response(null, { status: 404 });
                    }
                    const headers = {
                        "Last-Modified": pathStat.mtime.toUTCString()
                    }
                    if (method === "head") {
                        return new Response(null, { headers });
                    }
                    try { 
                      const fileStream = createReadStream(path);
                      return new Response(ReadableStream.from(fileStream), { headers });
                    } catch (error) {
                      console.log(error);
                      return new Response(String(error), { status: 500 });
                    }
                  }
                }
                
                `)}`
            } else {
                console.warn("Unknown or unimplemented service type");
                console.log(service);
            }



            // TODO include supported features
            if (isInherit) {
                inherit.push([service.worker.inherit, next]);
            } else {
                if (!next.entrypoint) {
                    next.entrypoint = "fetch";
                }
                if (!next.entrypointArguments) {
                    next.entrypointArguments = [
                        "request",
                        "bindings",
                        "$event"
                    ];
                }

                config.services.push(next);
            }
        }

        for (const [from, service] of inherit) {
            const other = config.services.find(named => named.name === from);
            ok(other, `Expected service ${from} to be configured before ${service.name} to inherit from`);
            const fromBindings = other.bindings ?? [];
            const serviceBindings = service.bindings ?? [];
            const fromBindingNames = fromBindings
                .map(binding => binding.name)
                .filter(Boolean)
            const next = {
                ...inherit,
                ...service,
                bindings: [
                    ...fromBindings,
                    ...serviceBindings.filter(
                        binding => !binding.name || fromBindingNames.includes(binding.name)
                    )
                ]
            };
            config.services.push(next);
        }
    }
    if (Array.isArray(parsed.sockets)) {
        for (const socket of parsed.sockets) {
            let next: SocketType = {
                name: socket.name,
                service: socket.service,
                address: socket.address
            }
            if (socket.http) {
                next = {
                    type: "http",
                    ...socket.http,
                    ...next
                };
            } else if (socket.https) {
                next = {
                    type: "https",
                    ...socket.https.options,
                    ...socket.https,
                    ...next
                }
            }
            config.sockets.push(next);
        }
    }
    if (Array.isArray(parsed.bindings)) {
        config.bindings.push(...parseBindings(parsed.bindings));
    }
    return config
}

async function importCapnpConfigModule(url: URL) {
    return parseCapnp(url);
}

async function importConfigModule(url: string | URL) {
    const instance = url instanceof URL ? url : new URL(url, "file:///");
    if (instance.pathname.endsWith(".capnp")) {
        return importCapnpConfigModule(instance);
    }
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
            if (config.services?.length === 1) {
                return config.services[0];
            }
            if (config.sockets?.length === 1) {
                return parseOptions(config.sockets[0].service);
            }
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
    noStringifyConfig?: boolean
    install?: boolean | string | string[];
}

/**
 * Import configuration and initiate services
 */
export async function importConfiguration(source: string | URL | Config, { virtual, noStringifyConfig, install }: ImportConfigurationOptions = {}) {
    let config: Config;
    if (typeof source === "string" || source instanceof URL) {
        config = await importConfigModule(source);
        config.url = new URL(source, "file://").toString();
    } else {
        config = source;
        ok(config.url, "Must give base url for config if provided directly");
    }

    // This saves us from creating these values multiple times...
    // ... is okay to use parse/stringify... isn't the best but that is okay
    if (!noStringifyConfig) {
        replaceFunctions(config);
    }

    const getService = await initialiseServices(config);

    // Installs and activates all workers before listening or continuing.
    // This will give service workers a point of
    if ((install || config.install) && config.services?.length) {
        const installServices = typeof install === "string" ?
            [install] :
            Array.isArray(install) ? install :
            typeof config.install === "string" ?
                [config.install] :
                Array.isArray(config.install) ? config.install : [];
        const installAllServices = (
            (install === true || !install) &&
            (config.install === true || !config.install)
        );
        await Promise.all(
            config.services.map(
                async service => {
                    if (installAllServices || installServices.includes(service.name)) {
                        const { activated } = await getService(service);
                        await activated;
                    }
                }
            )
        )
    }

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
    } as const;
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

        respondWith(service.fetch(request))

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

function replaceFunctions(value: unknown): void {
    if (!value) return;
    if (Array.isArray(value)) {
        return value.forEach(replaceFunctions);
    }
    if (typeof value !== "object") return;
    for (const [key, nextValue] of Object.entries(value)) {
        if (key === "url" && typeof nextValue === "function") {
            Object.assign(value, { [key]: getMaybeFunctionURL(nextValue) })
        } else {
            replaceFunctions(nextValue);
        }
    }

}