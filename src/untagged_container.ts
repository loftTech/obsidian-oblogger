import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { App, getAllTags, Menu, MenuItem, moment, TFile } from "obsidian";
import { ObloggerSettings, ContainerSortMethod, getSortMethodDisplayText, RxGroupType } from "./settings";
import { FileModificationEventDetails } from "./constants";

interface RenderedFile {
    file: TFile;
    mtime: number;
    ctime: number;
}

export class UntaggedContainer extends ViewContainer {
    renderedFiles: RenderedFile[];

    constructor(
        app: App,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        collapseChangedCallback: (groupName: string, collapsedFolders: string[], save: boolean) => void,
        requestRenderCallback: () => void,
        settings: ObloggerSettings,
        saveSettingsCallback: () => void,
        moveCallback: (up: boolean) => void,
        hideCallback: () => void
    ) {
        super(
            app,
            RxGroupType.UNTAGGED,
            fileClickCallback,
            fileAddedCallback,
            collapseChangedCallback,
            false,
            requestRenderCallback,
            settings,
            saveSettingsCallback,
            (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            moveCallback,
            hideCallback,
            true, // isMovable
            false, // canCollapseInnerFolders
            false, // canBePinned
            undefined,
            false); // isPinned
    }

    protected shouldRender(
      oldState: FileModificationEventDetails,
      newState: FileModificationEventDetails
    ): boolean {
        return false;
    }
    //
    // protected shouldRerenderOnModification(
    //     modifiedFile: FileModificationEventDetails
    // ): boolean {
    //     const renderedFile = this.renderedFiles.find(rf => rf.file === modifiedFile.file);
    //     const wasUntagged = renderedFile !== undefined;
    //
    //     const isUntagged = (getAllTags(modifiedFile.metadata)?.length ?? 0) === 0;
    //     if (wasUntagged !== isUntagged) {
    //         // it was rendered (meaning it was untagged) but now it has tags, or
    //         // it was not rendered (meaning it had tags) but now is untagged...redraw
    //         return true;
    //
    //     }
    //     if (!isUntagged) {
    //         // irrelevant
    //         return false;
    //
    //     }
    //     // if we're sorting by created and the created time changed, redraw
    //     if (
    //         renderedFile?.ctime !== modifiedFile.file.stat.ctime &&
    //         this.getGroupSetting()?.sortMethod === ContainerSortMethod.CTIME
    //     ) {
    //         return true;
    //
    //     }
    //     // if we're sorting by modified and the modified time changed and
    //     // the file is not in the top or bottom depending on ordering, redraw
    //     return renderedFile?.mtime !== modifiedFile.file.stat.mtime &&
    //       this.getGroupSetting()?.sortMethod === ContainerSortMethod.MTIME &&
    //       (
    //         this.getGroupSetting()?.sortAscending ?
    //           this.renderedFiles.first() :
    //           this.renderedFiles.last()
    //       )?.file !== modifiedFile.file;
    //
    //
    // }

    protected getEmptyMessage(): string {
        return "No untagged documents";
    }

    protected getHideText(): string {
        return "Hide";
    }

    protected getHideIcon(): string {
        return "eye-off"
    }

    protected getTitleText(): string {
        return "Untagged";
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected getTextIcon(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getPillIcon(): string {
        return this.getGroupSetting()?.sortAscending ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            const changeSortMethod = async (method: string) => {
                const groupSetting = this.getGroupSetting();
                if (groupSetting === undefined) {
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

    protected getContainerClass(): string {
        return "rx-child";
    }

    protected addFileToFolder(file: TFile, remainingTag:string, pathPrefix:string) {
        this.renderedFiles.push({
            file: file,
            mtime: file.stat.mtime,
            ctime: file.stat.ctime
        });
        super.addFileToFolder(file, remainingTag, pathPrefix);
    }

    private buildAlphabeticalFileStructure(
        unsortedFiles: TFile[],
        ascending: boolean
    ): void {
        unsortedFiles
            .sort((fileA: TFile, fileB: TFile) => {
                const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                if (bookmarkSorting != 0) {
                    return bookmarkSorting;
                }
                return (ascending ? 1 : -1) * this.sortFilesByName(fileA, fileB);
            })
            .forEach((file: TFile) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache === null) {
                    return;
                }

                if ((getAllTags(cache)?.length ?? -1) === 0) {
                    this.addFileToFolder(
                        file,
                        "",
                        "/"
                    );
                }
            });
    }

    private buildDateFileStructure(
        unsortedFiles: TFile[],
        ascending: boolean,
        useCTime: boolean
    ) {
        unsortedFiles.sort((fileA: TFile, fileB: TFile) => {
            const timestampA = useCTime ? fileA.stat.ctime : fileA.stat.mtime;
            const timestampB = useCTime ? fileB.stat.ctime : fileB.stat.mtime;

            const monthA = moment(timestampA).format("YYYY-MM");
            const monthB = moment(timestampB).format("YYYY-MM");
            if (monthA < monthB) {
                return ascending ? 1 : -1;
            } else if (monthA > monthB) {
                return ascending ? -1 : 1;
            }

            const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
            if (bookmarkSorting != 0) {
                return bookmarkSorting;
            }

            return (ascending ? 1 : -1) * (timestampB - timestampA);
        }).forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache === null) {
                console.error("Cache is null after filtering files. This shouldn't happen.");
                return;
            }
            const entryDateString = useCTime ? file.stat.ctime : file.stat.mtime;
            const entryDate = moment(entryDateString);
            const entryDateYear = entryDate.format("YYYY");
            const entryDateMonth = entryDate.format("MM");
            this.addFileToFolder(
                file,
                `${entryDateYear}/${entryDateMonth}`,
                "/"
            );
        });
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        this.renderedFiles = [];

        const includedFiles = this.app.vault.getFiles().filter(file => {
            if (file.extension !== "md") {
                return false;
            }

            if (
                file.parent &&
                excludedFolders.some(
                    (excludedFolder: string) =>
                        file.parent?.path.startsWith(excludedFolder))
            ) {
                return false;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            return cache !== null && ((getAllTags(cache)?.length ?? 1) <= 0);
        });

        switch (this.getGroupSetting()?.sortMethod) {
            case ContainerSortMethod.ALPHABETICAL:
                this.buildAlphabeticalFileStructure(
                    includedFiles,
                    this.getGroupSetting()?.sortAscending ?? true);
                break;
            case ContainerSortMethod.CTIME:
                this.buildDateFileStructure(
                    includedFiles,
                    this.getGroupSetting()?.sortAscending ?? true,
                    true);
                break;
            case ContainerSortMethod.MTIME:
                this.buildDateFileStructure(
                    includedFiles,
                    this.getGroupSetting()?.sortAscending ?? true,
                    false);
                break;
        }
    }
}

