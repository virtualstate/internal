import {FileData} from "./types";
import {writeFile, mkdir, stat, readFile, unlink, readdir, rmdir} from "fs/promises";
import {dirname, join, resolve} from "node:path";
import {getRemoteSourceKey, getRemoteSourcePrefix} from "./source";

function getDirectoryBase(file: FileData) {
    return resolve(getRemoteSourceKey(file.source, "store") ?? ".cache/.store");
}

function getDirectoryPrefix(file: FileData) {
    let prefix = file.source ? getRemoteSourcePrefix(file.source) : "";
    if (!prefix) {
        return "";
    }
    if (!prefix.endsWith("/")) {
        prefix = `${prefix}/`;
    }
    return prefix;
}

function getFullPath(file: FileData) {
    const path = getDirectoryBase(file);
    const prefix = getDirectoryPrefix(file);
    const key = `${prefix}${file.fileName}`
    let fullPath = join(path, key);
    if (!fullPath.startsWith("/")) {
        fullPath = join(process.cwd(), fullPath);
    }
    return resolve(fullPath);
}

export async function saveToDisk(file: FileData, contents: Buffer | Blob): Promise<Partial<FileData>> {
    const fullPath = getFullPath(file);
    const pathDirectory = dirname(fullPath);
    await mkdir(pathDirectory, {
        recursive: true
    });
    const buffer = Buffer.isBuffer(contents) ?
        contents :
        Buffer.from(await contents.arrayBuffer());
    await writeFile(
        fullPath,
        buffer
    );
    return {
        synced: "disk",
        syncedAt: new Date().toISOString(),
        url: `file://${fullPath}`
    };
}

async function isPathOnDisk(path: string) {
    try {
        const pathStat = await stat(path);
        return pathStat.isFile();
    } catch {
        return false
    }
}

export async function readFileFromDisk(file: FileData): Promise<Buffer | undefined> {
    const fullPath = getFullPath(file);
    const isOnDisk = await isPathOnDisk(fullPath);
    if (!isOnDisk) {
        return undefined;
    }
    return await readFile(fullPath);
}

export async function unlinkFromDisk(file: FileData) {
    const fullPath = getFullPath(file);
    const isOnDisk = await isPathOnDisk(fullPath);
    if (!isOnDisk) {
        return;
    }
    await unlink(fullPath);
    await unlinkDirectoryIfNeeded();

    async function unlinkDirectoryIfNeeded() {
        const base = resolve(getDirectoryBase(file));
        const absolute = resolve(fullPath);
        if (!absolute.startsWith(base)) {
            // We shouldn't mess with anything
            // Outside of normal cache root
            return;
        }
        let directory = dirname(absolute);
        while (directory.startsWith(base) && directory !== base && directory !== `${base}/`) {
            const paths = await readdir(directory);
            if (paths.length) {
                return;
            }
            await rmdir(directory);
            directory = dirname(directory);
        }
    }






}
