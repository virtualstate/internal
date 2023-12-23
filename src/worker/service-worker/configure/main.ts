#!/usr/bin/env node
import process from "node:process";
import {importConfiguration} from "./import";
import {join} from "node:path";
import { Config } from "./types";
import {ok} from "../../../is";

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
    await importConfiguration(configUrl);
} catch (error) {
    console.error(error);
    process.exit(1);
}