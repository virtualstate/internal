import {
    FileErrorDescription,
    FileType,
    getFile, getNamedFile,
    getRemoteSourceKey,
    ResolvedFilePart,
    File,
    saveToR2,
    setFile, FileData, isNamedFileType, isR2, saveToDisk, save
} from "../data";
import {isLike, ok} from "../is";
import {addFile, isNamedImportFileType, RemoteFileSourceName} from "../data";
import {v4} from "uuid";
import mime from "mime";
import {packageIdentifier} from "../package";
import {isFileLike} from "../data/file/is-like";

interface ValueIs<T> {
    (value: unknown): value is T;
}

export interface RemoteSourceOptions<T> {
    fileId?: string;
    source: RemoteFileSourceName;
    type?: FileType
    typeId?: string;
    url?: string;
    token?: string;
    json?: boolean;
    files?: boolean;
    is?: ValueIs<T>;
    headers?: boolean | Headers;
    handler(contents: T): Promise<ResolvedFilePart | ResolvedFilePart[] | unknown | undefined | void>;
    contents?(options: RemoteSourceOptions<T>): Promise<Blob>
}

export async function importRemoteSource<T>(options: RemoteSourceOptions<T>) {
    let urlBase = options.url ?? getRemoteSourceKey(options.source, "url");
    const type = options.type || `${options.source}_import`;
    if (!options.url) {
        if (options.typeId) {
            urlBase = urlBase.replace(":typeId", options.typeId);
            urlBase = urlBase.replace(":source", options.source);
            urlBase = urlBase.replace(":type", type);
        } else {
            ok(!urlBase.includes(":typeId"), `typeId required for ${type} and source ${options.source}`);
            urlBase = urlBase.replace(":source", options.source);
            urlBase = urlBase.replace(":type", type);
        }
    }
    const url = options.url || new URL(urlBase, getRemoteSourceKey(options.source, "origin")).toString();

    ok(isNamedFileType(type), `Expected "${type}" to match isNamedImportFileType`);

    console.log(url);

    const contents = await getRemoteSourceContents(url, options);
    const contentType = contents.type;
    const { pathname } = new URL(url);
    const finalPathname = pathname.split("/").at(-1) ?? "";
    const extension = options.json ? ".json" : (mime.getExtension(contents.type) ?? ".blob");
    const fileName = `${finalPathname ? `${finalPathname}-` : ""}${v4()}${extension}`;

    let existing;
    if (options.fileId) {
        existing = await getFile(options.fileId);
    }

    let file = await setFile({
        ...existing,
        type,
        contentType,
        fileName,
        source: options.source,
        remoteUrl: url,
        fileId: options.fileId
    });

    try {
        const buffer = Buffer.from(await contents.arrayBuffer());

        file = await save(file, buffer);

        let contentsParsed: unknown = contents;

        if (options.json) {
            contentsParsed = JSON.parse(
                buffer.toString("utf-8")
            );
        } else if (contentType.startsWith("text/")) {
            contentsParsed = buffer.toString("utf-8");
        }

        let contentsResolved: T;

        if (options.is) {
            if (options.is(contentsParsed)) {
                contentsResolved = contentsParsed;
            } else {
                return file;
            }
        } else {
            if (isLike<T>(contentsParsed)) {
                contentsResolved = contentsParsed;
            } else {
                return file;
            }
        }

        const returnedParts = await options.handler(contentsResolved);

        const resolved = returnedParts ? (Array.isArray(returnedParts) ? returnedParts : [returnedParts]) : [];

        file = await setFile({
            ...file,
            resolved,
            resolvedAt: new Date().toISOString()
        })

        if (options.files) {
            const resolvedFiles = [];
            let part: unknown;
            for (part of resolved) {
                if (!isFileLike(part)) continue;
                if (!part.url) continue;
                if (!part.signed) continue;
                // Use the external file, which includes live urls for access
                resolvedFiles.push(
                    await setFile(part)
                )
            }
            if (resolvedFiles.length) {
                file = await setFile({
                    ...file,
                    resolved: resolvedFiles.map(file => ({ fileId: file.fileId })),
                    resolvedAt: new Date().toISOString()
                });
            }
        }

    } catch (error) {

        const description: FileErrorDescription = {
            message: "",
            createdAt: new Date().toISOString()
        }
        if (error instanceof Error) {
            description.message = error.message;
            description.stack = error.stack;
        } else {
            description.message = String(error);
        }

        const lastError = file.errors?.at(-1);

        let errors: FileErrorDescription[] = [
            ...(file.errors ?? [])
        ];

        // If we have a repeating error, replace it rather than
        // adding another, mark as repeated
        if (lastError?.message === description.message) {
            errors[errors.length - 1] = {
                ...lastError,
                ...description,
                repeated: (lastError.repeated ?? 1) + 1
            };
        } else {
            errors.push(description);
        }

        // Errors may grow forever, so don't collect them
        if (errors.length > 15) {
            errors = errors.slice(-15);
        }

        file = await setFile({
            ...file,
            errors
        });
    }

    return file;
}

export async function getRemoteSourceContents(url: string, options: RemoteSourceOptions<unknown>): Promise<Blob> {
    if (options.contents) {
        return options.contents(options);
    }
    const token = options.token || getRemoteSourceKey(options.source, "token");
    const headers = new Headers(
        options.headers instanceof Headers ?
                options.headers :
                undefined
    );
    if (options.headers !== false) {
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        if (options.json) {
            headers.set("Accept", "application/json");
        }
    }
    const response = await fetch(
        url,
        {
            method: "GET",
            headers
        }
    );
    if (!response.ok) {
        console.log(await response.text());
    }
    ok(response.ok, `Expected importRemoteSource response ok, returned status ${response.status}`);
    return response.blob();
}
