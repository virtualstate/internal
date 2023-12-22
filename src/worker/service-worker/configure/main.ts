import process from "node:process";
import {importConfiguration} from "./import";
import {join} from "node:path";

function isURL(value: string) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

const argv = [...process.argv];

let configUrl = argv.pop();

if (!configUrl.startsWith("/") && !isURL(configUrl)) {
    configUrl = join(process.cwd(), configUrl);
}

await importConfiguration(configUrl);