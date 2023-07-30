import { App, getAllTags, Menu, moment, Notice, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ObloggerSettings, RxGroupType } from "./settings";
import { NewTagModal } from "./new_tag_modal";

export class EntriesContainer extends ViewContainer {
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
            RxGroupType.ENTRIES,
            fileClickCallback,
            fileAddedCallback,
            collapseChangedCallback,
            false, // showStatusIcon
            requestRenderCallback,
            settings,
            saveSettingsCallback,
            (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            moveCallback,
            hideCallback,
            true, // isMovable
            false, // canBePinned
            undefined,
            false); // isPinned
    }

    protected getEmptyMessage(): string {
        return `No documents tagged #${this.settings.entriesTag};`
    }

    protected getHideText(): string {
        return "Hide";
    }

    protected getHideIcon(): string {
        return "eye-off"
    }

    protected getTitleText(): string {
        return "Entries";
    }

    protected getTitleIcon(): string {
        return "";
    }

    protected getTitleIconTooltip(): string {
        return "";
    }

    protected getPillText(): string {
        return "#" + this.settings.entriesTag;
    }

    protected getPillTooltipText(): string {
        return "Change default tag associated with entries";
    }

    protected getPillIcon(): string {
        return "";
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();
            menu.addItem(item => {
                item.setTitle("Change entry tag");
                item.setIcon("replace");
                item.onClick(() => {
                    const modal = new NewTagModal(this.app, async (result: string) => {
                        if (!result) {
                            new Notice("Not setting entries tag")
                            return;
                        }
                        this.settings.entriesTag = result;
                        this.saveSettingsCallback();
                        this.requestRender();
                    });
                    modal.open();
                });
            });
            menu.showAtMouseEvent(e);
        }
    }

    protected getContainerClass(): string {
        return "rx-child";
    }

    protected buildFileStructure(excludedFolders: string[]) {
        const getEntryDate = (entry: TFile, dayPrecision: boolean): string => {
            const cache = this.app.metadataCache.getFileCache(entry);
            return moment(cache?.frontmatter?.day ??
                cache?.frontmatter?.created ??
                entry.stat.ctime).format(dayPrecision ? "YYYY-MM-DD" : "YYYY-MM");
        }

        this.app.vault
            .getFiles()
            .sort((fileA: TFile, fileB: TFile): number => {
                const monthA = getEntryDate(fileA, false);
                const monthB = getEntryDate(fileB, false);
                if (monthA > monthB) {
                    return -1;
                }
                if (monthA < monthB) {
                    return 1;
                }

                const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                if (bookmarkSorting != 0) {
                    return bookmarkSorting;
                }

                const dayA = getEntryDate(fileA, true);
                const dayB = getEntryDate(fileB, true);
                return dayA > dayB ? -1 : dayA < dayB ? 1 : 0;
            })
            .forEach((file: TFile) => {
                if (file.parent && excludedFolders.contains(file.parent.path)) {
                    return;
                }

                const cache = this.app.metadataCache.getFileCache(file);
                if (cache === null) {
                    return;
                }

                if (!getAllTags(cache)?.contains("#" + this.settings.entriesTag)) {
                    return;
                }

                const entryDateString = getEntryDate(file, true);
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
}

