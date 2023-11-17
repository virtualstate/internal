import { addEventListener, periodicSync, caches, index, dispatchEvent } from "@virtualstate/internal";

addEventListener("periodicsync", ({ tag, waitUntil }) => {
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

await periodicSync.register("images", {
    minInterval: 5 * 60 * 1000 // Refresh every 5 minutes
});

// Ran elsewhere by scheduler
// Is usually managed by
await dispatchEvent({
    type: "periodicsync",
    tag: "images",
    schedule: {
        immediate: true
        // can give delay here or cron
        // minInterval doesn't always mean a fixed rate
        //
        // delay: 5 * 60 * 1000,
        // repeat: true
    }
});