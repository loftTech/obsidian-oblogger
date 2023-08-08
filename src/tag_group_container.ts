import { App, getAllTags, Menu, MenuItem, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ContainerSortMethod, getSortMethodDisplayText, ObloggerSettings } from "./settings";


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
            true, // canCollapseInnerFolders
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
                    changeSortMethod(method);
                });
                if (method === this.getGroupSetting()?.sortMethod) {

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

    private getAllAssociatedTags(excludedFolders: string[]): TagFileMap {
        interface Item {
            file: TFile;
            tags: string[];
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
                            return tag.split("/")[0] === this.groupName;
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
