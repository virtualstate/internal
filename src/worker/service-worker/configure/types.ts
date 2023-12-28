import {AddRoutesOptions, RouterRuleSource, RouterSource} from "../router";
import {DurableServiceWorkerScope} from "../types";

export interface WorkerParameter {
    type: keyof WorkerBindingSourceOptions | string;
    optional?: boolean;
}

export type ImportableURL = string | URL | ((self: DurableServiceWorkerScope) => Promise<void | unknown> | void | unknown);

export interface WorkerBindingSourceOptions {
    text?: string;
    data?: BlobPart;
    json?: string | unknown;
    import?: ImportableURL;
    service?: ServiceEntrypointOption;
    queue?: ServiceEntrypointOption;
    fromEnvironment?: string;
}

export interface WorkerBindingTypeOptions extends WorkerBindingSourceOptions {
    parameter?: WorkerParameter
}

export interface WorkerBinding extends WorkerBindingTypeOptions, ImportCallOptions {
    name?: string;
    protocol?: string;
    routes?: AddRoutesOptions;
}

export interface WorkerOptions {
    bindings?: WorkerBinding[];
    globalOutbound?: string
}

export interface ScriptWorker {
    // Optional if importing from same directory, could be just a different entrypoint from ServiceEntrypoint
    url?: ImportableURL | ImportableURL[];
}

export interface SourceWorker {
    source?: RouterRuleSource;
}

export interface Service extends ScriptWorker, SourceWorker, WorkerOptions {
    name?: string;
    entrypoint?: string;
    entrypointArguments?: string[];
}

export interface NamedService extends Service {
    name: string;
}

export type ServiceEntrypointOption =
    | string
    | Service;

export interface Socket {
    address: string;
    service: ServiceEntrypointOption;
    type?: string;
    name?: string;
    routes?: AddRoutesOptions;
}

export interface HttpOptions {

}

export interface HttpSocket extends Socket, HttpOptions {
    type?: "http"; // default
}

export interface HttpsTlsOptions {

}

export interface HttpsSocket extends Socket, HttpOptions {
    type: "https";
    tls?: HttpsTlsOptions;
}

export type SocketType = HttpSocket | HttpsSocket;

export interface Extension {
    url: ImportableURL | ImportableURL[];
    name?: string;
}

export type ExtensionType = Extension | ImportableURL;

export interface Config {
    url?: string;
    services?: NamedService[];
    sockets?: SocketType[];
    extensions?: ExtensionType[];
    // Install all or specific named services
    install?: boolean | string | string[];
    bindings?: WorkerBinding[];
}

const example: Config = {
    services: [
        {
          // Name only, would be mapped as `url: "./named.js"` automatically
          // is used with an entrypoint later
          name: "named"
        },
        {
            name: "example",
            url: "./example.js",
            bindings: [
                {
                    name: "./",
                    import: "./main.js"
                },
                {
                    name: "./static.json",
                    json: {
                        key: "value"
                    }
                },
                {
                    name: "./import.wasm",
                    import: "./import.wasm"
                },
                {
                    name: "./import.json",
                    import: "./import.json",
                    assert: { type: "json" }
                },
                {
                    name: "./requested/resource.json",
                    service: {
                        name: "named",
                        entrypoint: "getRequestedResource",
                        entrypointArguments: ["request", "$event", "SPECIAL_CONTEXT_KEY"]
                    }
                },
                {
                    name: "./blob.csv",
                    data: new Blob([new TextEncoder().encode("a,b,c\n1,2,3")], { type: "text/csv" })
                },
                {
                    name: "./blob.array.csv",
                    data: new TextEncoder().encode("a,b,c\n1,2,3")
                },
                {
                    name: "./blob.data.csv",
                    data: "a,b,c\n1,2,3"
                },
                {
                    name: "./blob.text.csv",
                    text: "a,b,c\n1,2,3"
                }
            ]
        }
    ],
    sockets: [
        {
            name: "example",
            address: "*:3000",
            service: "example",
            type: "http"
        },
        {
            address: "*:3001",
            service: "example"
        },
        {
            address: "*:3002",
            routes: [
                {
                    condition: { urlPattern: "/api/*" },
                    source: "fetch-event"
                }
            ],
            service: "example"
        }
    ]
}