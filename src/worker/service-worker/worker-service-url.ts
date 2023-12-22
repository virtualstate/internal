import {Config, Service} from "./configure/types";
import {join} from "node:path";
import process from "node:process";
import {ok} from "../../is";

export function getImportUrlSourceForService(service: Service, config: Config) {
    if (!service.url) {
        // TODO search for files async
        return join(process.cwd(), "index.js");
    }
    if (!Array.isArray(service.url)) {
        return new URL(service.url, config.url).toString();
    }
    const [first] = service.url;
    ok(first, "Expected at least one url to import for service");
    return new URL(first, config.url).toString();
}