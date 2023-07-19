import { App, getAllTags, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ObloggerSettings } from "./settings";


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
        saveSettingsCallback: () => void
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
            removeCallback);
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

    protected getTitleText(): string {
        return this.groupName.split("/").last() ?? ""
    }

    protected getPillText(): string {
        return "#" + (this.groupName.split("/").first() ?? "") + (
            this.groupName.contains("/") ? "..." : ""
        )
    }

    protected getPillTooltipText(): string {
        return this.groupName.contains("/") ? this.groupName : "";
    }

    protected getPillIcon(): string {
        return "";
    }

    protected getPillClickHandler(): (() => void) | undefined {
        return undefined;
    }

    protected buildFileStructure(excludedFolders: string[]) {
        interface Item {
            file: TFile,
            tags: string[]
        }

        type TagFileMap = { [key: string]: TFile[] };

        const tags = this.app.vault
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
                    ?.filter((tag: string) => tag.startsWith(this.groupName));
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

        Object.keys(tags).sort().forEach((tag: string) => {
            const subTag = tag.replace(this.groupName, "");
            tags[tag].forEach((file: TFile) => {
                this.addFileToFolder(
                    file,
                    subTag.startsWith("/") ? subTag.slice(1) : subTag,
                    "/"
                );
            });
        });
    }

    protected getContainerClass(): string {
        return "otc-child";
    }
}
