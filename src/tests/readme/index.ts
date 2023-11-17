export {}

await import("./worker/main.js");
await import("./cache/cache.js");
await import("./content-index/index.js");
await import("./sync/sync.js");
await import("./periodic-sync/periodic-sync.js");