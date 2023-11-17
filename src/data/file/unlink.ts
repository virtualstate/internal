import {File, FileData} from "./types";
import {isR2, unlinkFromR2} from "./r2";
import {unlinkFromDisk} from "./disk";
import {KeyValueStore} from "../storage";
import {deleteFile} from "./delete-file";
import {getFile} from "./get-file";

export async function unlink(file: string | FileData, givenStore?: KeyValueStore<File>) {
    if (typeof file === "string") {
        file = await getFile(file);
        if (!file) {
            return;
        }
    }
    if (isR2()) {
        await unlinkFromR2(file);
    } else {
        await unlinkFromDisk(file);
    }
    await deleteFile(file, givenStore);
}