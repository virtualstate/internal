import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import {extname, join} from "node:path";
import {replaceBetween} from "./replace-between.js";

const PATH = "./src/data"
const CLIENT_INTERFACE_GENERATED_PATH = "./src/client/interface.readonly.ts"
const CLIENT_INTERFACE_PATH = "./src/client/client.interface.ts"
const COMMON_PATH = "src";
const CLIENT_COMMON_RELATIVE = "../";

const CLIENT_START_LINE = "// Client start";

const IGNORE_TYPES = [
    "access-token",
    "background",
    "authentication-state",
    "cache",
    "user",
    "storage",
    "user-credential"
];

const paths = await readdir(PATH)

const typePaths = (
    await Promise.all(
        paths
            .filter(name => !IGNORE_TYPES.includes(name))
            .map(
                async (name) => {
                    const path = join(PATH, name);
                    const pathStat = await stat(path).catch(() => undefined);
                    if (!pathStat) return "";
                    if (!pathStat.isDirectory()) return "";

                    const typesPath = join(path, "types.ts");
                    const typesStat = await stat(typesPath).catch(() => undefined);
                    if (!typesStat) return "";
                    if (!typesStat.isFile()) return "";

                    return typesPath;
                }
            )
    )
)
    .filter(Boolean);


const types = (
    await Promise.all(
        typePaths
            .map(
                async (typesPath) => {
                    const typesFile = await readFile(typesPath, "utf-8");
                    // Assume all imports are to other types that will be contained in this file
                    // If not the build will fail :)
                    return typesFile
                        .replace(/(import|export).+from.+/mg, "")
                }
            )
    )
)
    .filter(Boolean)
    .map(value => value.trim())
    .join("\n\n")

// console.log(types);

const typesFile = typePaths
    .map(
        typePath => {
            const path = typePath
                .replace(`./${COMMON_PATH}/`, CLIENT_COMMON_RELATIVE)
                .replace(`${COMMON_PATH}/`, CLIENT_COMMON_RELATIVE);
            const extension = extname(path);
            return `export * from "${path.replace(extension, "")}"`;
        }
    )
    .join("\n");

await writeFile(
    CLIENT_INTERFACE_GENERATED_PATH,
    `// These references are auto generated, do not edit manually\n\n${typesFile}\n`,
    "utf-8"
);

let client = await readFile(CLIENT_INTERFACE_PATH, "utf-8");

client = client
    .split(CLIENT_START_LINE)
    .at(1)
    .replace(/^\/\/.+/mg, "")
    .replace(/^import\s*.+/mg, "")

const interfaceContents = [client, types].map(value => value.trim()).join("\n\n");

await replaceBetween("README.md", "typescript client", `\`\`\`typescript\n${interfaceContents}\n\`\`\``)
