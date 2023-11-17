import {FileData, File} from "./types";
import {isLike} from "../../is";

export function isFileLike(file: unknown): file is FileData & Partial<File> {
    return !!(
        isLike<FileData>(file) &&
        file.fileName &&
        file.contentType
    );
}