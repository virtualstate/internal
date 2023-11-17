import {Happening, HappeningData} from "./types";
import {KeyValueStoreOptions} from "../storage";
import {getExpiringStore} from "../expiring-kv";

const STORE_NAME = "happening" as const;

export function getHappeningStore<H extends HappeningData = Happening>(name: string = STORE_NAME, options?: KeyValueStoreOptions) {
    return getExpiringStore<H>(name, {
        counter: true,
        ...options
    });
}