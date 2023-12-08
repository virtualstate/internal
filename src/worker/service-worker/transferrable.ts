import {FileHandle} from "node:fs/promises";
import {X509Certificate} from "node:crypto";
import {Blob} from "node:buffer";
import {MessagePort} from "worker_threads";

type TransferListItem = ArrayBuffer | MessagePort | FileHandle | X509Certificate | Blob;

export function isTransferable(object: unknown): object is TransferListItem {
    return (
        object instanceof ArrayBuffer ||
        object instanceof ReadableStream ||
        object instanceof TransformStream ||
        object instanceof WritableStream
    )
}

export function listTransferable(object: unknown): TransferListItem[] {
    if (!object) return [];
    if (Array.isArray(object)) {
        return object.flatMap(listTransferable);
    }
    if (isTransferable(object)) {
        return [object];
    }
    if (typeof object !== "object") {
        return [];
    }
    return Object.values(object).flatMap(listTransferable)
}