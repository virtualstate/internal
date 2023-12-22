import {importConfiguration} from "../../../../worker/service-worker/configure/import";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const pathname = fileURLToPath(import.meta.url);
const path = join(dirname(pathname), "./config.js");

const { close } = await importConfiguration(new URL(path, "file://"));

console.log("Listening for configured services");

{
    const response = await fetch("http://localhost:3000/offers");
    console.log(response.status);
    console.log(await response.text());
}

await close();