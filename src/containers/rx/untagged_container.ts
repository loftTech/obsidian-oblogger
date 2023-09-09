import { ViewContainer } from "../view_container";
import { App, getAllTags, Menu, MenuItem, moment, TFile } from "obsidian";
import { ObloggerSettings, ContainerSortMethod, getSortMethodDisplayText, RxGroupType } from "../../settings";
import { FileState } from "../../constants";
import { ContainerCallbacks } from "../container_callbacks";

interface RenderedFile {
    file: TFile;
    mtime: number;
    ctime: number;
}

export class UntaggedContainer extends ViewContainer {
    renderedFiles: RenderedFile[];

    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks
    ) {
        super(
            app,
            RxGroupType.UNTAGGED,
            false,
            settings,
            true, // isMovable
            false, // canCollapseInnerFolders
            false, // canBePinned
            false, // isPinned
            callbacks);
    }

    protected wouldBeRendered(state: FileState): boolean {
        return state.tags.length === 0;
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
                await this.callbacks.saveSettingsCallback();
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

            if (this.isFileExcluded(file, excludedFolders)) {
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
