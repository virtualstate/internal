import {AddRoutesOptions} from "../router";

export interface WorkerParameter {
    type: keyof WorkerBindingSourceOptions | string;
    optional?: boolean;
}

type ImportableURL = string | URL;

export interface WorkerBindingSourceOptions {
    text?: string;
    data?: BlobPart;
    json?: string | unknown;
    import?: ImportableURL;
    service?: ServiceEntrypointOption;
    queue?: ServiceEntrypointOption;
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
}

export interface ScriptWorker {
    // Optional if importing from same directory, could be just a different entrypoint from ServiceEntrypoint
    url?: ImportableURL | ImportableURL[];
}

export interface Service extends ScriptWorker, WorkerOptions {
    name?: string;
}

export interface ServiceEntrypoint extends Service {
    entrypoint?: string;
}

export interface NamedService extends Service {
    name: string;
}

export type ServiceEntrypointOption =
    | string
    | ServiceEntrypoint;

export interface Socket {
    address: string;
    type?: string;
    name?: string;
    service?: ServiceEntrypointOption;
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
}

const example: Config = {
    services: [
        {
            name: "example",
            url: "./",
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
                        entrypoint: "getRequestedResource"
                    }
                },
                {
                    name: "./blob.csv",
                    data: new Blob([new TextEncoder().encode("a,b,c\n1,2,3")], { type: "text/csv" })
                },
                {
                    name: "./blob.text.csv",
                    data: "a,b,c\n1,2,3"
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
        },
        {
            // Default same directory service
            address: "*:3003"
        }
    ]
}