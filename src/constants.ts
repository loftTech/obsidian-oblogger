import { App, CachedMetadata, getAllTags, TFile } from "obsidian";

const MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX = 500;

// Using a minimum resolution width to determine desktop (including ipad)
// and mobile, in order to move the suggester window to the correct
// position.
export function isDesktopLikeResolution() {
    return window.screen.availWidth >= MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX;
}

// todo: this needs a better name
export interface FileModificationEventDetails {
    file: TFile;
    maybeMetadata?: CachedMetadata;
    mtime: number;
    ctime: number;
    path: string;
    basename: string;
    extension: string;
    tags: string[];
}

// todo: this needs a better name
export const buildFromFile = (
    app: App,
    file: TFile,
    maybeMetadata?: CachedMetadata
) : FileModificationEventDetails => {
    const stillMaybeMetadata = (maybeMetadata ?? app.metadataCache.getFileCache(file)) ?? undefined;
    return {
        file,
        maybeMetadata: stillMaybeMetadata,
        mtime: file.stat.mtime,
        ctime: file.stat.ctime,
        path: file.path,
        basename: file.basename,
        extension: file.extension,
        tags: (stillMaybeMetadata ? getAllTags(stillMaybeMetadata) : []) ?? []
    };
}
