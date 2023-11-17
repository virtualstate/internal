# @virtualstate/internal 

[//]: # (badges)

### Support

 ![Node.js supported](https://img.shields.io/badge/node-%3E%3D18.7.0-blue) ![Bun supported](https://img.shields.io/badge/bun-%3E%3D1.0.2-blue) 

### Test Coverage



[//]: # (badges)

# Usage

## [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

[`worker.js`](src/tests/readme/worker/worker.js)
```javascript
self.addEventListener("fetch", event => {
    event.respondWith(new Response("Hello"))
});
```

[`main.js`](src/tests/readme/worker/main.js)
```javascript
import { serviceWorker, createServiceWorkerFetch } from "@virtualstate/internal";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pathname = fileURLToPath(import.meta.url);
const worker = join(dirname(pathname), "./worker.js");

const registration = await serviceWorker.register(worker);

const fetch = createServiceWorkerFetch(registration);

const response = await fetch("/");
const text = await response.text();

console.log(response.status, text); // 200 "Hello";
```

```bash
REDIS_MEMORY=1 node main.js
```

## [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

[cache.js](./src/tests/readme/cache/cache.js)
```javascript
import { caches } from "@virtualstate/internal";

const cache = await caches.open("cache");

const url = "https://example.com";

await cache.add(url);

const response = await cache.match(url);
const text = await response.text();

console.log(response.status, text.substring(0, 15), text.length); // 200 "<!doctype html>" 1256;
```

## [ContentIndex](https://developer.mozilla.org/en-US/docs/Web/API/ContentIndex)

[index.js]()
```javascript
import { index, caches } from "@virtualstate/internal";

const entry = {
    id: "post-1",
    url: "/posts/amet.html",
    title: "Amet consectetur adipisicing",
    description:
        "Repellat et quia iste possimus ducimus aliquid a aut eaque nostrum.",
    icons: [
        {
            src: "https://javascript.org.nz/logo.png",
            sizes: "128x128",
            type: "image/png",
        },
    ],
    category: "article",
};
await index.add(entry);

console.log(await index.getAll()) // [{ id: "post-1" }]

const cache = await caches.open("contentIndex");

for (const { src } of entry.icons) {
    const response = await cache.match(src);
    const { byteLength } = await response.arrayBuffer();
    console.log(src, response.status, byteLength) // ... 200 5348
}
```