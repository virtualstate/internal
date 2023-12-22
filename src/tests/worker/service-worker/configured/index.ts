import {importConfiguration} from "../../../../worker/service-worker/configure";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const pathname = fileURLToPath(import.meta.url);
const configPath = new URL(join(dirname(pathname), "./config.js"), "file://");

{
    const { close } = await importConfiguration(configPath);

    console.log("Listening for configured services");

    {
        const response = await fetch("http://localhost:3000/offers");
        console.log(response.status);
        console.log(await response.text());
    }

    await close();
}

{
    const { fetch } = await importConfiguration(configPath, { virtual: true });

    {
        const response = await fetch("http://localhost:3000/offers");
        console.log(response.status);
        console.log(await response.text());
    }

}