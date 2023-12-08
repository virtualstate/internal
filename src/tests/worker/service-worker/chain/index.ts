import {serviceWorker} from "../../../../worker";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const pathname = fileURLToPath(import.meta.url);

const pathA = join(dirname(pathname), "./a.js");
const pathB = join(dirname(pathname), "./b.js");
const pathC = join(dirname(pathname), "./c.js");

const a = await serviceWorker.register(pathA);
const b = await serviceWorker.register(pathB);
const c = await serviceWorker.register(pathC);

const responseA = await a.fetch("/", {
    method: "POST",
    body: "Initial"
});
const responseB = await b.fetch("/", {
    method: "POST",
    body: responseA.body
});
const responseC = await c.fetch("/", {
    method: "POST",
    body: responseB.body
});
const finalText = await responseC.text();
console.log({ finalText });

