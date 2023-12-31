import { App, CachedMetadata, getAllTags, TFile } from "obsidian";

const MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX = 500;

// Using a minimum resolution width to determine desktop (including ipad)
// and mobile, in order to move the suggester window to the correct
// position.
export function isDesktopLikeResolution() {
    return window.screen.availWidth >= MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX;
}

export function isBookmarked(app: App, file: TFile): boolean {
    return !!app.internalPlugins.plugins["bookmarks"].instance?.items?.find(item => {
        return item.type === "file" && item.path === file.path
    });
}

export interface FileState {
    file: TFile;
    maybeMetadata?: CachedMetadata;
    mtime: number;
    ctime: number;
    path: string;
    basename: string;
    extension: string;
    tags: string[];
    isBookmarked: boolean;
}

export const buildStateFromFile = (
    app: App,
    file: TFile,
    maybeMetadata?: CachedMetadata
) : FileState => {
    const stillMaybeMetadata = (maybeMetadata ?? app.metadataCache.getFileCache(file)) ?? undefined;
    return {
        file,
        maybeMetadata: stillMaybeMetadata,
        mtime: file.stat.mtime,
        ctime: file.stat.ctime,
        path: file.path,
        basename: file.basename,
        extension: file.extension,
        tags: (stillMaybeMetadata ? getAllTags(stillMaybeMetadata) : []) ?? [],
        isBookmarked: isBookmarked(app, file)
    };
}
