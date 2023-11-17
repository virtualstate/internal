import {FileData} from "./types";
import {isR2, readFileFromR2} from "./r2";
import {readFileFromDisk} from "./disk";

export async function readFile(file: FileData) {
    if (isR2()) {
        return readFileFromR2(file);
    } else {
        return readFileFromDisk(file);
    }
}

export async function fetchFile(file: FileData) {
    const contents = await readFile(file);
    return new Response(contents, {
        status: contents ? 200 : 404
    });
}