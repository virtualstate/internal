import { caches } from "@virtualstate/internal";

const cache = await caches.open("cache");

const url = "https://example.com";

await cache.add(url);

const response = await cache.match(url);
const text = await response.text();

console.log(response.status, text.substring(0, 15), text.length); // 200 "<!doctype html>";