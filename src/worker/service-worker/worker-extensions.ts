import {Config, ExtensionType} from "./configure";

export async function importWorkerExtensions(config: Config) {
    if (!config.extensions) return;
    for (const extension of config.extensions) {
        await importWorkerExtension(extension);
    }

    async function importWorkerExtension(type: ExtensionType) {
        const extension = typeof type === "string" || type instanceof URL ? {
            url: type
        } : type;

        if (extension.url === type || !extension.name) {
            // If not named, we will import into the global scope.

            const urls = Array.isArray(extension.url) ? extension.url : [extension.url];
            for (const url of urls) {
                const instance = new URL(url, config.url);
                instance.searchParams.set("importCacheBust", Date.now().toString());
                await import(instance.toString());
            }
        }


    }
}