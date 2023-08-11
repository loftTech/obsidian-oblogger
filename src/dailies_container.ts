import { App, getAllTags, Menu, moment, Notice, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ObloggerSettings, RxGroupType } from "./settings";
import { NewTagModal } from "./new_tag_modal";
import { FileModificationEventDetails } from "./constants";

export class DailiesContainer extends ViewContainer {
    fileEntryDates: { file: TFile, date: string }[]

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
            RxGroupType.DAILIES,
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
            true, // canCollapseInnerFolders
            false, // canBePinned
            undefined,
            false); // isPinned

        this.fileEntryDates = [];
    }

    protected shouldRerenderOnModification(
        modifiedFile: FileModificationEventDetails,
        excludedFolders: string[]
    ): boolean {
        const shouldBeIncluded = this.shouldIncludeFile(modifiedFile.file, excludedFolders);
        const isIncluded = this.hasFileWithin(modifiedFile.file);

        if (shouldBeIncluded != isIncluded) {
            return true;
        }

        if (!isIncluded && !shouldBeIncluded) {
            // file is irrelevant
            return false;
        }

        // file is already included and should be, but check if the date changed
        const existingDate = this.fileEntryDates.find(
            fileDate => fileDate.file === modifiedFile.file)?.date;
        const modifiedDate = this.getDailyDate(modifiedFile.file, true);

        return existingDate != modifiedDate;
    }

    protected getEmptyMessage(): string {
        return `No documents tagged #${this.settings.dailiesTag};`
    }

    protected getHideText(): string {
        return "Hide";
    }

    protected getHideIcon(): string {
        return "eye-off"
    }

    protected getTitleText(): string {
        return "Daily Notes";
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected getTitleIcon(): string {
        return "";
    }

    protected getTitleIconTooltip(): string {
        return "";
    }

    protected getPillText(): string {
        return "#" + this.settings.dailiesTag;
    }

    protected getPillTooltipText(): string {
        return "Change default tag associated with dailies";
    }

    protected getPillIcon(): string {
        return "";
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();
            menu.addItem(item => {
                item.setTitle("Change daily tag");
                item.setIcon("replace");
                item.onClick(() => {
                    const modal = new NewTagModal(this.app, async (result: string) => {
                        if (!result) {
                            new Notice("Not setting dailies tag")
                            return;
                        }
                        this.settings.dailiesTag = result;
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

    private shouldIncludeFile(file: TFile, excludedFolders: string[]): boolean {
        if (file.parent && excludedFolders.contains(file.parent.path)) {
            return false;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        if (cache === null) {
            return false;
        }

        if (!getAllTags(cache)?.contains("#" + this.settings.dailiesTag)) {
            return false;
        }
        return true;
    }

    private getDailyDate(daily: TFile, dayPrecision: boolean): string {
        const cache = this.app.metadataCache.getFileCache(daily);
        return moment(cache?.frontmatter?.day ??
            cache?.frontmatter?.created ??
            daily.stat.ctime).format(dayPrecision ? "YYYY-MM-DD" : "YYYY-MM");
    }

    protected buildFileStructure(excludedFolders: string[]) {
        this.fileEntryDates = [];

        this.app.vault
            .getFiles()
            .filter((file: TFile) => {
                return this.shouldIncludeFile(file, excludedFolders);
            })
            .sort((fileA: TFile, fileB: TFile): number => {
                const monthA = this.getDailyDate(fileA, false);
                const monthB = this.getDailyDate(fileB, false);
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

                const dayA = this.getDailyDate(fileA, true);
                const dayB = this.getDailyDate(fileB, true);
                return dayA > dayB ? -1 : dayA < dayB ? 1 : 0;
            })
            .forEach((file: TFile) => {
                const dailyDateString = this.getDailyDate(file, true);
                this.fileEntryDates.push({file, date: dailyDateString});
                const dailyDate = moment(dailyDateString);
                const dailyDateYear = dailyDate.format("YYYY");
                const dailyDateMonth = dailyDate.format("MM");
                this.addFileToFolder(
                    file,
                    `${dailyDateYear}/${dailyDateMonth}`,
                    "/"
                );
            });
    }
}

