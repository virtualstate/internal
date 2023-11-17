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