import {Config, Service, ImportableURL} from "./configure/types";
import {ok} from "../../is";

export function getMaybeFunctionURL(url: ImportableURL) {
    if (typeof url !== "function") {
        return url;
    }
    return `data:text/javascript,${encodeURIComponent(`
    const $_IMPORTED_FUNCTION = (${String(url)});
    export default await $_IMPORTED_FUNCTION(self);
    `)}`
}

export function getImportUrlSourceForService(service: Service, config: Config) {
    let url = service.url;
    if (!url) {
        // TODO map to different extensions
        url = `./${service.name}.js`;
    }
    if (!Array.isArray(url)) {
        return new URL(getMaybeFunctionURL(url), config.url).toString();
    }
    const [first] = url;
    ok(first, "Expected at least one url to import for service");
    return new URL(getMaybeFunctionURL(first), config.url).toString();
}