import {isNumberString, ok} from "../../is";
import {BaseFileRemoteSourceName, RemoteFileSourceName} from "../data";
import {index} from "cheerio/lib/api/traversing";

export const TYPE_BASE_NAMES: BaseFileRemoteSourceName[] = ["product", "inventory", "offer", "inventoryItem", "order", "orderItem"];
const NAMES: BaseFileRemoteSourceName[] = ["discord", ...TYPE_BASE_NAMES, "productFile", "inventoryFile", "offerFile"];
const NAMES_STRINGS: string[] = NAMES;

export type RemoteSourceEnvName = "token" | "origin" | "store" | "name" | "prefix" | "url" | "cacheBust" | "enableFileSource";
const SOURCE_ENV_KEY: Record<RemoteSourceEnvName, string> = {
    store: "OFFLINE_STORE",
    name: "COMMUNITY_NAME",
    token: "TOKEN",
    origin: "ORIGIN",
    prefix: "PREFIX",
    url: "URL",
    cacheBust: "CACHE_BUST",
    enableFileSource: "ENABLE_FILE"
};

/*
export type BaseFileStoreType = "product" | "inventory"
export type BaseFileRemoteSourceName = "discord" | BaseFileStoreType;
export type RemoteFileSourceName = BaseFileRemoteSourceName | `${BaseFileRemoteSourceName}_${number}`;
 */


export function getRemoteSources(): RemoteFileSourceName[] {

    const names: RemoteFileSourceName[] = [];
    for (const name of NAMES) {
        if (isRemoteSource(name)) {
            names.push(name);
        }
        for (let i = 0; ; i += 1) {
            const indexedName = `${name}_${i}`;
            ok(isRemoteFileSourceName(indexedName));
            if (!isRemoteSource(indexedName)) {
                break;
            }
            console.log(indexedName);
            names.push(indexedName);
        }
    }
    return names;

    function isRemoteSource(name: RemoteFileSourceName) {
        const isIndexed = /_\d+$/.test(name);
        const fileEnabled = getRemoteSourceKey(name, "enableFileSource");
        const url = getRemoteSourceKey(name, "url", isIndexed);
        if (!url) return false;
        if (isSupportedOrigin(url)) return true;
        if (/_\d+$/.test(name)) return false;
        const origin = getRemoteSourceKey(name, "origin");
        return isSupportedOrigin(origin);

        function isSupportedOrigin(url: string) {
            if (!url) return false;
            return (
                (url.startsWith("https://") || url.startsWith("http://")) ||
                (fileEnabled && url.startsWith("file://"))
            )
        }
    }
}

const TYPES = ["MEDIA", "REMOTE"];

export function getRemoteSourceKey(source: RemoteFileSourceName | string | undefined, key: RemoteSourceEnvName, direct?: boolean) {
    const prefixes = [];
    if (source) {
        // First try the initial source
        prefixes.push(`${source}_`);
        // Then, if it is indexed, try it without the index, to allow parent env
        if (/_\d+$/.test(source) && !direct) {
            const base = source.replace(/_\d+$/, "");
            prefixes.push(`${base}_`);
        }
    }
    if (!direct) {
        // Lastly, try no prefix, the default
        prefixes.push("");
    }
    const resolvedKey = SOURCE_ENV_KEY[key];
    for (const prefix of prefixes) {
        for (const type of TYPES) {
            const envKey = `${prefix}${type}_${resolvedKey}`.toUpperCase();
            const envValue = process.env[envKey];
            if (envValue) {
                return envValue;
            }
        }
    }
    return undefined;
}

export function getRemoteSourcePrefix(source: RemoteFileSourceName | string | undefined): string {
    return getRemoteSourceKey(source, "prefix") || `${source}/`;
}

export function isBaseFileRemoteSourceName(name: string): name is BaseFileRemoteSourceName {
    return NAMES_STRINGS.includes(name);
}

export function isRemoteFileSourceName(name: string): name is RemoteFileSourceName {
    if (!name) return false;
    if (isBaseFileRemoteSourceName(name)) return true;
    const [given, digit, ...rest] = name.split("_");
    if (rest.length) return false;
    return (
        isNumberString(digit) &&
        isBaseFileRemoteSourceName(given)
    );
}