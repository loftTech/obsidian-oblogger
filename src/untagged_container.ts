import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { App, getAllTags, Menu, MenuItem, moment, TFile } from "obsidian";
import { ObloggerSettings, ContainerSortMethod, getSortMethodDisplayText, RxGroupType } from "./settings";

export class UntaggedContainer extends ViewContainer {
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
            (isCollapsed) => isCollapsed ? "folder" : "folder-open",
            moveCallback,
            hideCallback);
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

    protected getContainerClass(): string {
        return "rx-child";
    }

    private buildAlphabeticalFileStructure(
        unsortedFiles: TFile[],
        ascending: boolean
    ): void {
        unsortedFiles
            .sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const ascendingSortValue = aName < bName ? -1 : aName > bName ? 1 : 0
                return ascending ? ascendingSortValue : -ascendingSortValue;
            })
            .forEach(file => {
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
        unsortedFiles.sort((a, b) => {
            return (ascending ? 1 : -1) * (
                useCTime ?
                    (b.stat.ctime - a.stat.ctime) :
                    (b.stat.mtime - a.stat.mtime)
            );
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
        })
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        const includedFiles = this.app.vault.getFiles().filter(file => {
            if (file.extension !== "md") {
                return false;
            }

            if (
                file.parent &&
                excludedFolders.some(
                    excludedFolder =>
                        file.parent?.path.startsWith(excludedFolder))
            ) {
                return false;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            if (cache === null || ((getAllTags(cache)?.length ?? 1) > 0)) {
                return false;
            }

            return true;
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

