#!/usr/bin/env node
import process from "node:process";
import {importConfiguration} from "./import";
import {join} from "node:path";
import { Config } from "./types";
import {ok} from "../../../is";
import {DurableEventData} from "../../../data";

function isURL(value: string) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

async function read(stream: typeof process.stdin) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
}

process.on("unhandledRejection", console.error);

const argv = [...process.argv];

let configUrl: string | Config;

if (argv.includes("--stdin")) {
    configUrl = (await read(process.stdin)).trim()
} else {
    configUrl = argv.pop().trim();
}

if ((configUrl.startsWith("'") && configUrl.endsWith("'")) || (configUrl.startsWith(`"`) && configUrl.endsWith(`"`))) {
    configUrl = configUrl.slice(0, configUrl.length - 2);
}

if (configUrl.startsWith("{") && configUrl.endsWith("}")) {
    const config: Config = JSON.parse(configUrl);
    ok(config.url, "No url given in config");
    if (config.url.startsWith("./")) {
        config.url = join(process.cwd(), config.url);
    }
    if (!config.url.startsWith("file://")) {
        config.url = new URL(config.url, `file://${process.cwd()}`).toString()
    }
    configUrl = config;
} else if (!configUrl.startsWith("/") && !isURL(configUrl)) {
    configUrl = join(process.cwd(), configUrl);
}

try {

    const event = getOption("event");
    const service = getOption("service");
    const entrypoint = getOption("entrypoint");
    const request = getOption("request");
    const method = getOption("method");
    const body = getOption("body");

    const configured = await importConfiguration(configUrl, {
        noStringifyConfig: argv.includes("--no-stringify-config"),
        virtual: argv.includes("--virtual") || Boolean(event), // Forces NO listeners
        install: argv.includes("--install")
    });

    if (event) {
        const named = await configured.getService(service);
        const dispatch = await named.activated;
        const dispatching: DurableEventData = {
            type: event
        }
        if (event === "fetch" && request) {
            dispatching.request = {
                url: event,
                method,
                body
            };
        }
        await dispatch({
            type: "dispatch",
            dispatch: dispatching,
            entrypoint,
            virtual: true
        })
        console.log("Dispatched", event);
        if (!argv.includes("--no-exit")) {
            process.exit(0);
        }
    }
} catch (error) {
    console.error(error);
    process.exit(1);
}

function getOption(name: string) {
    const key = `--${name}`;
    const index = argv.indexOf(key);
    if (index === -1) return undefined;
    const next = index + 1;
    return argv[next];
}