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
            sizes: "200x200",
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