import * as dotenv from "dotenv";

dotenv.config();

import {
    File,
    getRemoteSourceKey,
    getRemoteSources,
    Offer,
    Product,
    setOffer,
    setProduct,
    TYPE_BASE_NAMES
} from "../data";
import {importRemoteSource} from "../remote/import";
import {ok} from "../is";

const sources = getRemoteSources();

console.log({ sources });

const typed = sources.filter(source => getRemoteSourceKey(source, "url").includes(":typeId"));
const bases = sources.filter(source => !typed.includes(source));

const imported: File[] = [];

for (const source of bases) {

    let handler;

    if (source === "product") {
        handler = async function handler(input: Product[]) {
            // console.log(input);
            for (const product of input) {
                await setProduct(product);
            }
            console.log("Updated products");
            return input;
        }
    } else if (source === "offer") {
        handler = async function handler(input: Offer[]) {
            // console.log(input);
            for (const offer of input) {
                await setOffer(offer);
            }
            console.log("Updated offers");
            return input;
        }
    }
    if (!handler) continue;
    const file = await importRemoteSource<unknown>({
        source,
        json: true,
        handler
    });
    console.log(file);
    imported.push(file);
}


for (const withType of typed) {
    const type = TYPE_BASE_NAMES.find(name => withType.startsWith(name));
    const base = imported.find(file => file.source === type);
    console.log({ base, type });
    if (!base?.synced) continue;
    const ids = base.resolved.map(value => value[`${type}Id`] || value["id"]).filter(Boolean);
    console.log({ ids, json: base.resolved, type });
    if (!ids.length) continue;
    for (const typeId of ids) {
        ok(typeof typeId === "string");
        const file = await importRemoteSource({
            source: withType,
            typeId,
            json: true,
            files: withType.endsWith("File"),
            async handler(input: unknown) {
                // console.log(input);
                return input;
            }
        });
        console.log(file);
        imported.push(file);
    }
}