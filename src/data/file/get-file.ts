import {getFileStore, getNamedFileStore, resolveFileStore} from "./store";
import {FileData, FileType} from "./types";

export function getFile(fileId: string | FileData) {
  if (typeof fileId === "string") {
    const store = getFileStore();
    return store.get(fileId);
  } else {
    const store = resolveFileStore(fileId);
    return store.get(fileId.fileId);
  }
}

export function getNamedFile(type: FileType, typeId: string, fileId: string) {
  const store = getNamedFileStore(type, typeId);
  return store.get(fileId);
}