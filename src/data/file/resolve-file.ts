import {File, ResolvedFile} from "./types";
import {join} from "node:path";
import {getRemoteSourceKey} from "./source";
import {isR2, MEDIA_BUCKET} from "./r2";
import {getSignedUrl} from "./r2";

import {ok, isNumberString} from "../../is";
import {getOrigin} from "../../listen";
import {packageIdentifier} from "../../package";
import {getExpiresAt} from "../expiring-kv";

const {
    IMAGE_RESIZING_URL,
    IMAGE_RESIZING_DEFAULT_SIZE,
    IMAGE_RESIZING_DEFAULT_QUALITY,
    IMAGE_RESIZING_WATERMARK_ORIGIN
} = process.env;

// https://developers.cloudflare.com/images/image-resizing/url-format/#recommended-image-sizes
export const DEFAULT_IMAGE_SIZE = 1920;
// From 1 to 100, default with Cloudflare is 85
const DEFAULT_IMAGE_QUALITY = 100;

const SIZE_QUALITY: Record<number, number> = {
    1920: 95,
    600: 85,
    100: 50
}

const BASE_SIZE = 600;

const WATERMARK_CACHE_BUST = `4.${packageIdentifier}`;

const DEFAULT_EXPIRES_IN_SECONDS = 3600;

export function getSize(given?: number): number {
    if (given) return given;
    if (isNumberString(IMAGE_RESIZING_DEFAULT_SIZE)) return +IMAGE_RESIZING_DEFAULT_SIZE;
    return DEFAULT_IMAGE_SIZE;
}

export function getQuality(given?: number, size?: number): number {
    if (given) return given;
    if (typeof size === "number") {
        const found = SIZE_QUALITY[size];
        if (found) {
            return found;
        }
    }
    if (isNumberString(IMAGE_RESIZING_DEFAULT_QUALITY)) return +IMAGE_RESIZING_DEFAULT_QUALITY;
    return DEFAULT_IMAGE_QUALITY;
}

export function getExpiresInSeconds(given?: number) {
    if (given) return given;
    return DEFAULT_EXPIRES_IN_SECONDS;
}

export interface ResolveFileOptions {
    public?: boolean
    size?: number;
    sizes?: boolean;
    quality?: number;
    expiresInSeconds?: number;
}

export async function getMaybeResolvedFile(file?: File, options?: ResolveFileOptions): Promise<ResolvedFile | undefined> {
    if (!file) return undefined;
    const { synced } = file;
    if (!synced) return undefined;
    const expiresInSeconds = getExpiresInSeconds(options?.expiresInSeconds);
    // Better to have an earlier expiresAt than later, so resolve it before
    // resolving the url itself
    const expiresAt = getExpiresAt(expiresInSeconds * 1000);

    if (options?.sizes) {
        ok(!options.size, "Unexpected size given along with sizes");
        let targetSizes = (file.sizes ?? []).filter(file => file.synced === synced);
        if (options.public) {
            targetSizes = targetSizes.filter(size => size.watermark);
        }
        if (targetSizes.length) {
            const signed = await Promise.all(
                targetSizes.map(
                    async targetSize => {
                        const targetFile: File = {
                            ...file,
                            ...targetSize,
                            sizes: [
                                targetSize
                            ]
                        };
                        const url = await getResolvedUrl(
                            targetFile,
                            {
                                ...options,
                                expiresInSeconds,
                                size: targetSize.width,
                                sizes: undefined,
                                public: targetSize.watermark
                            }
                        );
                        if (!url) return undefined;
                        return {
                            ...targetSize,
                            signed: true,
                            expiresAt,
                            url,
                            synced
                        };
                    }
                )
            );
            const sorted = signed
                .filter(Boolean)
                .sort((a, b) => (a.width + a.height) > (b.width + b.height) ? -1 : 1)
            if (sorted.length) {
                const defaultSize = getSize();
                const found = (
                    // Prefer non watermark as default
                    sorted.find(size => !size.watermark && size.width === defaultSize) ||
                    sorted.find(size => size.width === defaultSize) ||
                    sorted[0]
                );
                ok(found, "Expected size when length is over zero");
                return {
                    ...file,
                    sizes: sorted,
                    synced,
                    ...found,
                    signed: true,
                    expiresAt
                }
            }
        }
        // If there are no target sizes, let the default resolution happen
    }

    const url = await getResolvedUrl(file, {
        ...options,
        sizes: undefined,
        expiresInSeconds
    });
    if (!url) return undefined;
    return {
        ...file,
        synced,
        url,
        signed: true,
        expiresAt,
        sizes: undefined
    }
}

export async function getResolvedFile(file?: File, options?: ResolveFileOptions): Promise<ResolvedFile> {
    const resolved = await getMaybeResolvedFile(file, options);
    ok(resolved, `Expected file to be already resolved ${file.fileId}`)
    return resolved;
}

export function getImageResizingUrl(input: string, options: ResolveFileOptions) {
    const url = new URL(IMAGE_RESIZING_URL, getOrigin());
    if (input.includes(IMAGE_RESIZING_URL) && !options.public) {
        const inputUrl = new URL(input);
        if (inputUrl.searchParams.has("image")) {
            url.searchParams.set("image", inputUrl.searchParams.get("image"))
        } else {
            url.searchParams.set("image", input);
        }
    } else {
        url.searchParams.set("image", input);
    }

    const size = getSize(options.size);
    url.searchParams.set("width", size.toString());
    url.searchParams.set("height", size.toString());
    url.searchParams.set("fit", "scale-down");
    url.searchParams.set("quality", getQuality(options.quality, size).toString());
    return url;
}

export async function getResolvedUrl(file: File, options?: ResolveFileOptions) {
    if (!options || (!options.public && !options.size)) return getDirectURL();
    if (!file.contentType?.startsWith("image")) return getDirectURL();
    if (file.synced === "disk") return getDirectURL();
    const size = getSize(options.size);
    const defaultSize = getSize()
    const watermarked = (
        file.sizes?.find(value => value.width === size && value.watermark) ??
        file.sizes?.find(value => value.width === defaultSize && value.watermark) ??
        file.sizes?.find(value => value.watermark)
    );
    const matching = (
        file.sizes?.find(value => value.width === size && !value.watermark) ??
        file.sizes?.find(value => value.width === defaultSize && !value.watermark)
    );
    let input: string;
    if (options.public && watermarked) {
        const watermarkedUrl = watermarked.signed ? watermarked.url : await getR2URL(watermarked.url);
        if (watermarked.width === size || watermarked.height === size) {
            return watermarkedUrl;
        }
        input = watermarkedUrl;
    } else {
        if (matching) {
            const matchingUrl = matching.signed ? matching.url : await getR2URL(matching.url);
            if ((matching.width === size || matching.height === size) && !options.public) {
                return matchingUrl;
            }
            input = matchingUrl;
        } else {
            input = await getDirectURL()
        }
    }
    const url = getImageResizingUrl(input, options);

    if (options.public && !watermarked) {
        const ratio = size / BASE_SIZE;
        const draw: Record<string, unknown>[] = [
            {
                url: new URL(`/public/watermark.png?cacheBust=${WATERMARK_CACHE_BUST}`, IMAGE_RESIZING_WATERMARK_ORIGIN || getOrigin()).toString(),
                repeat: true,
                opacity: 0.5,
                fit: "contain",
                width: 170 * ratio,
            }
        ];
        if (file.uploadedByUsername) {
            const url = new URL(`/api/version/1/files/watermark/named.png`, IMAGE_RESIZING_WATERMARK_ORIGIN || getOrigin());
            url.searchParams.set("cacheBust", WATERMARK_CACHE_BUST);
            url.searchParams.set("name", `Uploaded by ${file.uploadedByUsername}`);
            const community = getRemoteSourceKey(file.source, "name");
            if (community) {
                url.searchParams.set("community", community);
            }
            draw.push({
                url: url.toString(),
                bottom: 5,
                left: 0,
                // "0 0 630 90"
                // 630*(50/90) = 350
                width: 350 * ratio,
                fit: "contain",
                gravity: "left"
            });
        }
        // console.log(file, draw);
        url.searchParams.set("draw", JSON.stringify(draw));
    }

    return url.toString();

    async function getR2URL(url: string) {
        const { pathname } = new URL(url);
        let key = pathname.replace(/^\//, "");
        if (key.startsWith(`${MEDIA_BUCKET}/`)) {
            // TODO remove, this was a bug 👀
            key = key.replace(`${MEDIA_BUCKET}/`, "")
        }
        // Specify a custom expiry for the presigned URL, in seconds
        const expiresIn = getExpiresInSeconds(options.expiresInSeconds);
        return await getSignedUrl({
            method: "get",
            key,
            expiresIn
        });
    }

    async function getDirectURL() {
        if (file.signed) {
            return file.url;
        }
        if (file.synced === "disk") {
            if (file.url.startsWith("file://")) {
                // Direct path
                return file.url;
            }
            const store = getRemoteSourceKey(file.source, "store");
            if (store) {
                return `file://${join(process.cwd(), store, file.fileName)}`
            }
            return `file://${file.fileName}`;
        }
        if (file.synced === "r2") {
            if (!isR2()) {
                // Cannot get key if no key or secret
                return undefined;
            }
            return getR2URL(file.url);
        }
        return undefined;
    }
}