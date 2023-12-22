declare var _ORIGINAL_GLOBAL_FETCH: typeof fetch;

export const globalFetch = typeof _ORIGINAL_GLOBAL_FETCH === "undefined" ? fetch : _ORIGINAL_GLOBAL_FETCH;
