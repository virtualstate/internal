import {Config, Service, ExtensionType, ImportableURL} from "./configure";
import {DurableServiceWorkerScope} from "./types";

export async function importWorkerExtensions(config: Config, extensions: ExtensionType[], self: DurableServiceWorkerScope) {
    if (!config || !extensions) return;

    const now = Date.now().toString();
    for (const extension of extensions) {
        await importWorkerExtension(extension);
    }
    async function importWorkerExtension(type: ExtensionType) {
        const extension = typeof type === "string" || type instanceof URL || typeof type === "function" ? {
            url: type
        } : type;

        if (extension.url === type || !extension.name) {
            // If not named, we will import into the global scope.

            const urls = Array.isArray(extension.url) ? extension.url : [extension.url];
            for (const url of urls) {
                if (typeof url === "function") {
                    await url(self);
                } else {
                    const instance = new URL(url, config.url);
                    instance.searchParams.set("importCacheBust", now);
                    await import(instance.toString());
                }
            }
        }
    }
}