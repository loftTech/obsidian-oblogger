import { App, getAllTags, Menu, MenuItem, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback, FileRetainedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ContainerSortMethod, getSortMethodDisplayText, ObloggerSettings } from "./settings";
import { FileState } from "./constants";


type TagFileMap = { [key: string]: TFile[] };

interface FileTags {
    file: TFile;
    tags: string[];
}

export class TagGroupContainer extends ViewContainer {
    renderedFileTags: FileTags[];

    constructor(
        app: App,
        baseTag: string,
        removeCallback: () => void,
        moveCallback: (up: boolean) => void,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        fileRetainedCallback: FileRetainedCallback,
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
            fileRetainedCallback,
            collapseChangedCallback,
            false,
            requestRenderCallback,
            settings,
            saveSettingsCallback,
            (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            moveCallback,
            removeCallback,
            false, // isMovable
            true, // canCollapseInnerFolders
            true, // canBePinned
            pinCallback,
            isPinned
        );
    }

    protected wouldBeRendered(state: FileState): boolean {
        // if we don't have metadata, then it's not going to be rendered
        if (!state.maybeMetadata) {
            return false;
        }
        // this code is duplicated below. it checks if the group name (tag) is
        // included somewhere in the tags
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);
        return (getAllTags(state.maybeMetadata)
            ?.map(tag => tag.replace("#", ""))
            ?.unique()
            ?.filter((tag: string) => {
                if (isolatedGroupName) {
                    return tag.contains(isolatedGroupName);
                } else {
                    return tag.startsWith(this.groupName);
                }
            }).length ?? 0) > 0;
    }

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        const groupSettings = this.getGroupSetting();
        switch(groupSettings?.sortMethod) {
            case ContainerSortMethod.ALPHABETICAL:
                // shouldn't actually happen because we should be deciding
                // to render before we hit this point. But just in case...
                return oldState.basename !== newState.basename;
            case ContainerSortMethod.CTIME:
                return oldState.ctime !== newState.ctime;
            case ContainerSortMethod.MTIME: {
                // if the doc should be at the top/bottom of the list and it's
                // not, then re-render
                const oldMostRecentFile =
                    groupSettings?.sortAscending ?
                        this.sortedFiles.last() :
                        this.sortedFiles.first();
                return (
                    oldState.mtime !== newState.mtime &&
                    oldMostRecentFile !== newState.file);
            }
        }
        return false;
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

    protected getTextIcon(): string {
        if (this.getIsolatedTagMatch()) {
            return "tags";
        }
        return "";
    }

    protected getTextIconTooltip(): string {
        return this.getIsolatedTagMatch() ? "Nested within multiple tags" : "";
    }

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getTitleTooltip(): string {
        if (this.getIsolatedTagMatch()) {
            return "Associated tags:\n\n" + Object.keys(this.getAllAssociatedTags([]))
                .sort()
                .map(tag => `#${tag}`)
                .join("\n");
        }
        return `#${this.groupName}`;
    }

    protected getPillIcon(): string {
        return (this.getGroupSetting()?.sortAscending ?? true) ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            const changeSortMethod = async (method: string) => {
                const groupSetting = this.getGroupSetting();
                if (groupSetting === undefined) {
                    console.warn("undefined group settings")
                    return;
                }

                if (groupSetting.sortMethod === method) {
                    groupSetting.sortAscending = !groupSetting.sortAscending;
                } else {
                    groupSetting.sortMethod = method;
                    groupSetting.sortAscending = true;
                }
                await this.saveSettingsCallback();
                this.requestRender();
            }

            const setupItem = (item: MenuItem, method: string) => {
                item.onClick(() => {
                    return changeSortMethod(method);
                });
                if (method === this.getGroupSetting()?.sortMethod) {
                    // Note: iconEl is added to MenuItem at run time
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.iconEl.addClass("untagged-sort-confirmation");

                    item.setIcon(
                        this.getGroupSetting()?.sortAscending ?
                            "down-arrow-with-tail" :
                            "up-arrow-with-tail");
                } else {
                    item.setIcon("down-arrow-with-tail");
                }
            }

            [
                ContainerSortMethod.ALPHABETICAL,
                ContainerSortMethod.CTIME,
                ContainerSortMethod.MTIME
            ].forEach(method => {
                menu.addItem(item => {
                    item.setTitle(getSortMethodDisplayText(method));
                    setupItem(item, method);
                })
            })

            menu.showAtMouseEvent(e);
        }
    }

    private getFileTags(
        file: TFile,
        excludedFolders: string[],
        isolatedGroupName: string | undefined
    ): FileTags | null {
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
        if (!tags?.length) {
            return null;
        }
        return { file, tags };
    }

    private getAllAssociatedTags(excludedFolders: string[]): TagFileMap {
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);

        // This is pretty confusing bit of code. we're first getting all files
        // and their tags (wrapped in special objects and saved to `renderedFileTags`,
        // and then inverted to be a map of tag to list of files associated with
        // that tag.
        this.renderedFileTags = this.app.vault
            .getMarkdownFiles()
            .map(file => this.getFileTags(file, excludedFolders, isolatedGroupName))
            .filter(item => item !== null) as FileTags[];
        return this.renderedFileTags
            .reduce((acc: TagFileMap, item: FileTags) => {
                item.tags.forEach((tag: string) => {
                    if (!Object.keys(acc).contains(tag)) {
                        acc[tag] = [];
                    }
                    acc[tag].push(item.file);
                });
                return acc;
            }, {});
    }

    private getFileSortingFn(sortMethod: string) {
        switch (sortMethod) {
            case ContainerSortMethod.MTIME:
                return (fileA: TFile, fileB: TFile) => {
                    return fileA.stat.mtime - fileB.stat.mtime;
                }
            case ContainerSortMethod.CTIME:
                return (fileA: TFile, fileB: TFile) => {
                    return fileA.stat.ctime - fileB.stat.ctime;
                }
            case ContainerSortMethod.ALPHABETICAL:
            default:
                return (fileA: TFile, fileB: TFile) => {
                    return fileA.name < fileB.name ? -1 : fileA.name > fileB.name ? 1 : 0;
                }
        }
    }

    protected buildFileStructure(excludedFolders: string[]) {
        // clear the cache
        this.renderedFileTags = [];

        const tagFiles = this.getAllAssociatedTags(excludedFolders);
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);
        const ascending = this.getGroupSetting()?.sortAscending ?? true;
        const sortMethod = this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL;
        const fileSortingFn = this.getFileSortingFn(sortMethod);

        Object.keys(tagFiles).sort((tagA: string, tagB: string) => {
            // don't always sort tags. only sort them if sorting is alphabetical,
            // otherwise default to alpha ascending
            const modifier = sortMethod === ContainerSortMethod.ALPHABETICAL ? (ascending ? 1 : -1) : 1;
            return modifier * (tagA < tagB ? -1 : tagA > tagB ? 1 : 0);
        }).forEach((tag: string) => {
            const subTag = tag.replace(this.groupName, "");
            tagFiles[tag]
                .sort((fileA: TFile, fileB: TFile) => {
                    const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                    if (bookmarkSorting != 0) {
                        return bookmarkSorting;
                    }
                    return (ascending ? 1 : -1) * fileSortingFn(fileA, fileB);
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
