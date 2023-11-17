# @virtualstate/internal 

[//]: # (badges)

### Support

 ![Node.js supported](https://img.shields.io/badge/node-%3E%3D18.7.0-blue) ![Bun supported](https://img.shields.io/badge/bun-%3E%3D1.0.2-blue) 

### Test Coverage



[//]: # (badges)

### Usage

[`hello.js`](src/tests/worker/service-worker/readme/hello.js)
```javascript
self.addEventListener("fetch", event => {
    event.respondWith(new Response("Hello"))
});
```

[`main.js`](src/tests/worker/service-worker/readme/main.js)
```javascript
import { serviceWorker, createServiceWorkerFetch } from "@virtualstate/internal";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pathname = fileURLToPath(import.meta.url);
const worker = join(dirname(pathname), "./hello.js");

const registration = await serviceWorker.register(worker);

const fetch = createServiceWorkerFetch(registration);

const response = await fetch("/");
const text = await response.text();

console.log(response.status, text); // 200 "Hello";
```

```bash
REDIS_MEMORY=1 node main.js
```