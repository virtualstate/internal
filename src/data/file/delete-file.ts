import {getFileStore, resolveFileStore} from "./store";
import {File, FileData} from "./types";
import {KeyValueStore} from "../storage";

export function deleteFile(file: string | FileData, givenStore?: KeyValueStore<File>) {
    if (typeof file === "string") {
        const store = getFileStore();
        return store.delete(file);
    } else {
        const store = resolveFileStore(file, givenStore);
        return store.delete(file.fileId);
    }
}