import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {serviceWorker} from "../../../../worker";

const pathname = fileURLToPath(import.meta.url);

const pathA = join(dirname(pathname), "./a.js");
const pathB = join(dirname(pathname), "./b.js");
const pathC = join(dirname(pathname), "./c.js");

export async function register() {
    const a = await serviceWorker.register(pathA);
    const b = await serviceWorker.register(pathB);
    const c = await serviceWorker.register(pathC);
    return { a, b, c }
}

export async function getRegistrations() {
    const a = await serviceWorker.getRegistration(pathA);
    const b = await serviceWorker.getRegistration(pathB);
    const c = await serviceWorker.getRegistration(pathC);
    return { a, b, c }
}