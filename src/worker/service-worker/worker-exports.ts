declare var _GLOBAL_getServiceWorkerModuleExports: () => Record<string, unknown>;

export function getServiceWorkerModuleExports() {
    if (typeof _GLOBAL_getServiceWorkerModuleExports === "undefined") {
        return {};
    }
    return _GLOBAL_getServiceWorkerModuleExports();
}