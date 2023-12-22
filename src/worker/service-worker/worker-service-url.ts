import {Config, Service} from "./configure/types";
import {ok} from "../../is";

export function getImportUrlSourceForService(service: Service, config: Config) {
    let url = service.url;
    if (!url) {
        // TODO map to different extensions
        url = `./${service.name}.js`;
    }
    if (!Array.isArray(url)) {
        return new URL(url, config.url).toString();
    }
    const [first] = url;
    ok(first, "Expected at least one url to import for service");
    return new URL(first, config.url).toString();
}