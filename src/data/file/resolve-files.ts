import {File, FileType, getNamedFile, listNamedFiles} from "../file";
import {getMaybeResolvedFile, getResolvedFile, ResolveFileOptions} from "./resolve-file";

export const {
    MEDIA_PREFER_FIXED_ORDER
} = process.env;

export interface ListResolvedNamedFileOptions extends ResolveFileOptions {
    accept?: string;
}

export async function listResolvedNamedFiles(type: FileType, typeId: string, options: ListResolvedNamedFileOptions = {}): Promise<File[]> {
    let files = await listUnresolvedNamedFiles(type, typeId, options);
    if (options.public) {
        files = files.filter(file => file.pinned && !!file.sizes?.find(size => size.watermark));
    }
    const resolved = await Promise.all(
        files.map(
            file => getMaybeResolvedFile(file, options)
        )
    );
    return resolved.filter(Boolean);
}

export async function listUnresolvedNamedFiles(type: FileType, typeId: string, { accept }: ListResolvedNamedFileOptions = {}): Promise<File[]> {
    let files = await listNamedFiles(type, typeId);
    files = files
        .filter(file => file.synced)
        .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (b.pinned && !a.pinned) return 1;
            // Use the most recent first, updated images please :)
            return a.uploadedAt > b.uploadedAt ? -1 : 1
        });
    if (accept) {
        // "image" will match "image/jpeg"
        files = files.filter(file => file.contentType?.startsWith(accept))
    }
    return files;
}

export interface GetResolvedNamedFileOptions extends ListResolvedNamedFileOptions {
    fileId?: string;
    index?: number;
}

export async function getResolvedNamedFile(type: FileType, typeId: string, options: GetResolvedNamedFileOptions = {}): Promise<File | undefined> {
    const { fileId, accept, index, public: isPublic } = options;
    if (fileId) {
        const file = await getNamedFile(type, typeId, fileId);
        // Must be synced already to be able to get it
        return getMaybeResolvedFile(file, options);
    }
    const files = await listUnresolvedNamedFiles(type, typeId, { accept })
    const file = pick();
    if (!file) return undefined;
    return getResolvedFile(file, options);

    function pick() {
        if (!files.length) return undefined;
        // Allow picking directly from the sorted list if authenticated
        if (!isPublic && index) return files[index];
        let pinned = files.filter(file => file.pinned);
        if (isPublic) {
            const synced = pinned.find(file => file.synced);
            if (pinned.length && synced.synced !== "disk") {
                // If is public, only allow pre watermarked files
                pinned = pinned.filter(file => !!file.sizes?.find(size => size.watermark))
            }
        }
        if (pinned.length === 1) return pinned[0];
        if (pinned.length) {
            if (typeof index === "number") {
                return pinned[index];
            }
            if (MEDIA_PREFER_FIXED_ORDER) {
                return pickPopularFile(pinned);
            }
            return pickWeightedFiles(pinned);
        }
        // Only allow viewing the pinned images if public
        if (isPublic) return undefined;
        return files[index ?? pickIndex(files.length)];
    }

    function pickPopularFile(files: File[]) {
        const reactions = new Map(
            files.map(file => {
                const totalReactions = Object.values(file.reactionCounts || {})
                    .reduce((sum, value) => sum + value, 0);
                return [file, totalReactions] as const;
            })
        );
        const sorted = [...files]
            .sort((a, b) => reactions.get(a) > reactions.get(b) ? -1 : 1);
        return sorted[0];
    }

    function pickWeightedFiles(files: File[]) {
        const weighted = files.flatMap(file => {
            const totalReactions = Object.values(file.reactionCounts || {})
                .reduce((sum, value) => sum + value, 0);
            if (!totalReactions) return [file];
            return Array.from({ length: totalReactions + 1 }, () => file);
        });
        // if (weighted.length !== files.length) {
        //     console.log("Weighted files", files);
        // }
        // Mix them up
        const randomOrder = weighted.map(() => Math.random());
        // Order based on random index given above
        const randomlyOrdered = weighted.sort(
            (a, b) => randomOrder[weighted.indexOf(a)] < randomOrder[weighted.indexOf(b)] ? -1 : 1
        )
        // Pick from the randomly ordered files
        return randomlyOrdered[pickIndex(randomlyOrdered.length)];
    }

    function pickIndex(length: number) {
        const max = length - 1;
        return Math.max(
            0,
            Math.min(
                max,
                Math.round(Math.random() * max)
            )
        );
    }
}