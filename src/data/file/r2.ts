import type {S3Client as ClientType, S3ClientConfig} from "@aws-sdk/client-s3";
import type {RequestPresigningArguments} from "@smithy/types";
import {ok} from "../../is";
import {FileData} from "./types";
import {getRemoteSourcePrefix} from "./source";
import {getMediaPrefix, joinMediaPrefix} from "./prefix";
import {v4} from "uuid";
import {basename, extname} from "node:path";
import mime from "mime";
import {fromMaybeDurableBody} from "../durable-request";
import {
    R2_ACCESS_KEY_ID,
    R2_ACCESS_KEY_SECRET,
    R2_ENDPOINT,
    R2_BUCKET,
    R2_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_ACCESS_KEY_SECRET,
    AWS_DEFAULT_REGION,
    AWS_REGION,
    S3_BUCKET,
    S3_ENDPOINT,
    MEDIA_DEFAULT_BUCKET
} from "../../config";

export const MEDIA_BUCKET = MEDIA_DEFAULT_BUCKET || R2_BUCKET || S3_BUCKET;

export const r2Config = {
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || AWS_ACCESS_KEY_ID,
        secretAccessKey: R2_ACCESS_KEY_SECRET || AWS_ACCESS_KEY_SECRET,
    },
    endpoint: R2_ENDPOINT || S3_ENDPOINT,
    region: R2_REGION || AWS_REGION || AWS_DEFAULT_REGION || "auto"
} as const;

let r2Client: ClientType | undefined = undefined;

export async function getR2() {
    if (r2Client) return r2Client;
    ok(isR2(), "Expected R2 to be configured");
    const { S3Client } = await import("@aws-sdk/client-s3");
    r2Client = new S3Client(r2Config);
    return r2Client;
}

export function isR2() {
    return (
        (
            R2_ACCESS_KEY_ID &&
            R2_ACCESS_KEY_SECRET &&
            MEDIA_BUCKET &&
            R2_ENDPOINT
        ) ||
        (
            AWS_ACCESS_KEY_ID &&
            AWS_ACCESS_KEY_SECRET &&
            S3_ENDPOINT &&
            MEDIA_BUCKET
        )
    )
}

const { DISABLE_EXISTING_FILE } = process.env;

const ENABLE_EXISTING_FILE = !DISABLE_EXISTING_FILE;

export async function isExistingInR2(file: FileData) {
    // Disable any functionality trying to use existing
    if (!ENABLE_EXISTING_FILE) return false;
    const client = await getR2();
    let prefix = getRemoteSourcePrefix(file.source) ?? "";
    if (prefix && !prefix.endsWith("/")) {
        prefix = `${prefix}/`;
    }
    const key = `${prefix}${file.fileName}`
    // import {HeadObjectCommand, PutObjectCommand, S3Client, S3ClientConfig} from "@aws-sdk/client-s3";
    const {HeadObjectCommand} = await import("@aws-sdk/client-s3");
    const headCommand = new HeadObjectCommand({
        Key: key,
        Bucket: MEDIA_BUCKET,
    });
    try {
        await client.send(headCommand);
        return true;
    } catch {
        return false;
    }
}

export async function saveToR2(file: FileData, contents: Buffer | Blob): Promise<Partial<FileData>> {
    const client = await getR2()
    let prefix = getRemoteSourcePrefix(file.source) ?? "";
    if (prefix && !prefix.endsWith("/")) {
        prefix = `${prefix}/`;
    }
    const {PutObjectCommand} = await import("@aws-sdk/client-s3");
    const key = `${prefix}${file.fileName}`

    const buffer = Buffer.isBuffer(contents) ?
        contents :
        Buffer.from(await contents.arrayBuffer());

    const {createHash} = await import("node:crypto");
    const hash256 = createHash("sha256");
    hash256.update(buffer);
    const hash5 = createHash("md5");
    hash5.update(buffer);
    const checksum = {
        SHA256: hash256.digest().toString("base64"),
        MD5: hash5.digest().toString("base64")
    };

    const url = new URL(
        `/${key}`,
        R2_ENDPOINT || S3_ENDPOINT
    ).toString();

    if (await isExistingInR2(file)) {
        // console.log(`Using existing uploaded file for ${file.fileName}`);
        return {
            synced: "r2",
            syncedAt: file.syncedAt || new Date().toISOString(),
            url,
            // Allow checksum to be updated if it wasn't present!
            checksum: {
                ...checksum,
                ...file.checksum
            }
        }
    }

    // console.log(`Uploading file ${file.fileName} to R2`, checksum);

    const command = new PutObjectCommand({
        Key: key,
        Bucket: MEDIA_BUCKET,
        Body: buffer,
        ContentType: file.contentType,
        ContentMD5: checksum.MD5
    });

    const result = await client.send(command);
    return {
        synced: "r2",
        syncedAt: new Date().toISOString(),
        url,
        checksum: {
            ...checksum,
            ...getChecksum(result)
        }
    };
}

function getChecksum(result: { ChecksumCRC32?: string, ChecksumCRC32C?: string, ChecksumSHA1?: string, ChecksumSHA256?: string }) {
    if (!result.ChecksumSHA256) return undefined;
    return {
        CRC32: result.ChecksumCRC32,
        CRC32C: result.ChecksumCRC32C,
        SHA1: result.ChecksumSHA1,
        SHA256: result.ChecksumSHA256
    }
}


export interface SignedUrlOptions extends RequestPresigningArguments {
    method?: "get" | "put" | "post" | string;
    extension?: string;
    key?: string;
    url?: string;
    redirect?: string;
}

export function getR2URLFileData(url: string | URL): FileData {
    if (typeof url === "string") {
        return getR2URLFileData(
            new URL(url)
        );
    }
    const { pathname } = new URL(url);
    const fileName = basename(pathname);
    const contentType = mime.getType(pathname) ?? undefined;
    return {
        fileName,
        contentType,
        url: new URL(
            pathname, // Stripped url just the path
            url
        ).toString()
    }
}

export async function getSignedUrl(options: SignedUrlOptions) {
    const { url } = await getSigned(options);
    return url;
}

export interface R2SignedURL {
    url: string;
    fields?: Record<string, string>
}

function getKeyFromURLString(url: string) {
    const { pathname } = new URL(url);
    // Pathname starts with a slash, we want to skip it
    return pathname.substring(1);
}

export async function getSigned(options: SignedUrlOptions): Promise<R2SignedURL> {
    const client = await getR2();
    let { key, method, extension, redirect, url: givenUrl, ...signedUrlOptions } = options;
    if (!method) {
        method = "get";
    }
    let bucket = MEDIA_BUCKET;
    if (!key) {
        if (givenUrl) {
            // Pathname starts with a slash, we want to skip it
            key = getKeyFromURLString(givenUrl);
        } else {
            let name = v4();
            if (extension) {
                // "Extension should be like ".png", same value returned by extname(name)
                name = `${name}${extension}`;
            }
            // Key information becomes encoded in the returned url as pathname
            // no need to relay back this information
            // see getR2URLFileData
            key = joinMediaPrefix(name);
        }
    }
    if (method === "post") {
        console.warn("Warning POST upload is not supported by R2");
        const { createPresignedPost: create } = await import("@aws-sdk/s3-presigned-post");
        const prefix = getMediaPrefix();
        const contentType = extension ? (
            mime.getType(key) ?? undefined
        ) : undefined;
        const { url, fields } = await create(client, {
            Bucket: bucket,
            Key: key,
            Conditions: [
                { bucket: bucket },
                ["starts-with", "$key", `${prefix}/`]
            ],
            Fields: {
                success_action_redirect: redirect,
                "Content-Type": contentType
            }
        });
        return {
            url,
            fields
        }
    } else {
        const { getSignedUrl: get } = await import("@aws-sdk/s3-request-presigner");
        const { PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const Command = method.toLowerCase() === "put" ? PutObjectCommand : GetObjectCommand;
        const command = new Command({
            Bucket: bucket,
            Key: key
        });
        return {
            url: await get(client, command, signedUrlOptions)
        };
    }
}

export async function readFileFromR2(file: FileData) {
    const isOnR2 = await isExistingInR2(file);
    if (!isOnR2) {
        return undefined;
    }
    const client = await getR2();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const key = getKeyFromURLString(file.url);
    const command = new GetObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: key
    });
    const response = await client.send(command);
    const array = await response.Body.transformToByteArray();
    return Buffer.from(array);
}

export async function unlinkFromR2(file: FileData) {
    const isOnR2 = await isExistingInR2(file);
    if (!isOnR2) {
        return;
    }
    const client = await getR2();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const key = getKeyFromURLString(file.url);
    const command = new DeleteObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: key
    });
    await client.send(command);
}