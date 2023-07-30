import { App, getAllTags, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ObloggerSettings } from "./settings";


type TagFileMap = { [key: string]: TFile[] };

export class TagGroupContainer extends ViewContainer {
    constructor(
        app: App,
        baseTag: string,
        removeCallback: () => void,
        moveCallback: (up: boolean) => void,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        collapseChangedCallback: (baseTag: string, collapsedFolders: string[], save: boolean) => void,
        requestRenderCallback: () => void,
        settings: ObloggerSettings,
        saveSettingsCallback: () => void,
        pinCallback: (pin: boolean) => void,
        isPinned: boolean
    ) {
        super(
            app,
            baseTag,
            fileClickCallback,
            fileAddedCallback,
            collapseChangedCallback,
            false,
            requestRenderCallback,
            settings,
            saveSettingsCallback,
            (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            moveCallback,
            removeCallback,
            false, // isMovable
            true, // canBePinned
            pinCallback,
            isPinned
        );
    }

    protected getEmptyMessage(): string {
        return "";
    }

    protected getHideText(): string {
        return "Remove";
    }

    protected getHideIcon(): string {
        return "trash"
    }

    protected isVisible(): boolean {
        return true;
    }

    private getIsolatedTagMatch(): RegExpMatchArray | null {
        return this.groupName.match("\\.\\.\\./(.*)/\\.\\.\\.");
    }

    protected getTitleText(): string {
        const match = this.getIsolatedTagMatch();
        if (match) {
            return `${match[1]}`
        } else {
            return this.groupName.split("/").last() ?? ""
        }
    }

    protected getTitleIcon(): string {
        if (this.getIsolatedTagMatch()) {
            return "tags";
        }
        return "";
    }

    protected getTitleIconTooltip(): string {
        return this.getIsolatedTagMatch() ? "Nested within multiple tags" : "";
    }

    protected getPillText(): string {
        if (this.getIsolatedTagMatch()) {
            return "• • •";
        }
        return "#" + (this.groupName.split("/").first() ?? "") + (
            this.groupName.contains("/") ? "..." : ""
        )
    }

    protected getPillTooltipText(): string {
        if (this.getIsolatedTagMatch()) {
            return "Associated tags:\n\n" + Object.keys(this.getAllAssociatedTags([]))
                .sort()
                .map(tag => `#${tag}`)
                .join("\n");
        }
        return this.groupName.contains("/") ? this.groupName : "";
    }

    protected getPillIcon(): string {
        return "";
    }

    protected getPillClickHandler(): (() => void) | undefined {
        return undefined;
    }

    private getAllAssociatedTags(excludedFolders: string[]): TagFileMap {
        interface Item {
            file: TFile,
            tags: string[]
        }

        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);

        return this.app.vault
            .getMarkdownFiles()
            .map((file: TFile) => {
                // filter out excluded
                if (file.parent && excludedFolders.contains(file.parent.path)) {
                    return null;
                }
                const cache = this.app.metadataCache.getFileCache(file);
                // filter out files missing cache
                if (cache === null) {
                    return null;
                }
                const tags = getAllTags(cache)
                    ?.map(tag => tag.replace("#", ""))
                    ?.unique()
                    ?.filter((tag: string) => {
                        if (isolatedGroupName) {
                            return tag.contains(isolatedGroupName);
                        } else {
                            return tag.startsWith(this.groupName);
                        }
                    });
                if (!tags) {
                    return null;
                }
                return { file, tags };
            })
            .filter(item => item !== null)
            .reduce((acc: TagFileMap, item: Item) => {
                item.tags.forEach((tag: string) => {
                    if (!Object.keys(acc).contains(tag)) {
                        acc[tag] = [];
                    }
                    acc[tag].push(item.file);
                });
                return acc;
            }, {});
    }

    protected buildFileStructure(excludedFolders: string[]) {
        const tags = this.getAllAssociatedTags(excludedFolders);
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);

        Object.keys(tags).sort().forEach((tag: string) => {
            const subTag = tag.replace(this.groupName, "");
            tags[tag]
                .sort((fileA: TFile, fileB: TFile) => {
                    const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                    if (bookmarkSorting != 0) {
                        return bookmarkSorting;
                    }
                    return fileA.name < fileB.name ? -1 : fileA.name > fileB.name ? 1 : 0;
                })
                .forEach((file: TFile) => {
                    let remainingTag = subTag.startsWith("/") ? subTag.slice(1) : subTag;
                    if (isolatedGroupName) {
                        if (remainingTag.endsWith(isolatedGroupName)) {
                            remainingTag = remainingTag.replace(isolatedGroupName, "")
                        } else if (remainingTag.contains(isolatedGroupName)) {
                            remainingTag = remainingTag.split("/").last() ?? "";
                        }
                    }
                    this.addFileToFolder(
                        file,
                        remainingTag.startsWith("/") ? remainingTag.slice(1) : remainingTag,
                        "/"
                    );
                });
        });
    }

    protected getContainerClass(): string {
        return "otc-child";
    }
}
