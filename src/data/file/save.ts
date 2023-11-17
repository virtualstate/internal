import {isR2, saveToR2} from "./r2";
import {File, FileData} from "./types";
import {saveToDisk} from "./disk";
import {setFile} from "./set-file";
import {KeyValueStore} from "../storage";

export async function save(file: FileData, contents: Buffer | Blob, store?: KeyValueStore<File>): Promise<File> {
    const update = await saveTo();
    return setFile({
        ...file,
        ...update,
    }, store)

    async function saveTo() {
        if (isR2()) {
            return await saveToR2(file, contents);
        } else {
            return await saveToDisk(file, contents);
        }
    }
}