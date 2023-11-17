import { addEventListener, sync, caches, index, dispatchEvent } from "@virtualstate/internal";

addEventListener("sync", ({ tag, waitUntil }) => {
    if (tag === "images") {
        waitUntil(onSyncImages());
    }

    async function onSyncImages() {
        const cache = await caches.open("contentIndex");
        for (const { id, icons } of await index.getAll()) {
            for (const { src } of icons) {
                console.log(`Updating icon "${src}" for ${id}`);
                await cache.put(
                    src,
                    await fetch(src)
                );
            }
        }
    }
});

await sync.register("images");

// Ran elsewhere by scheduler
// Is usually managed by generateVirtualSyncEvents
await dispatchEvent({
    type: "sync",
    tag: "images",
    schedule: {
        immediate: true
    }
});