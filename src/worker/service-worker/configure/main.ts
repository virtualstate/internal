import process from "node:process";
import {importConfiguration} from "./import";

const argv = [...process.argv];

const configUrl = argv.shift();

await importConfiguration(configUrl);