import { App, FrontMatterCache, getAllTags, Menu, moment, Notice, TFile } from "obsidian";
import { FileClickCallback, FileAddedCallback, FileRetainedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { ObloggerSettings, RxGroupType } from "./settings";
import { NewTagModal } from "./new_tag_modal";
import { FileState } from "./constants";

export class DailiesContainer extends ViewContainer {
    fileEntryDates: { file: TFile, date: string }[]

    constructor(
        app: App,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        fileRetainedCallback: FileRetainedCallback,
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
            fileRetainedCallback,
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

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        const oldDailyDate = this.getDailyDate(
            oldState.ctime,
            true,
            oldState.maybeMetadata?.frontmatter);
        const newDailyDate = this.getDailyDate(
            newState.ctime,
            true,
            newState.maybeMetadata?.frontmatter);
        return oldDailyDate !== newDailyDate;
    }

    protected wouldBeRendered(state: FileState): boolean {
        return state.tags.contains("#" + this.settings.dailiesTag);
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

    protected getTextIcon(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
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

        return getAllTags(cache)?.contains("#" + this.settings.dailiesTag) ?? false;

    }

    private getDailyDate(
        ctime: number,
        dayPrecision: boolean,
        frontmatter?: FrontMatterCache
    ): string {
        return moment(frontmatter?.day ??
            frontmatter?.created ??
            ctime).format(dayPrecision ? "YYYY-MM-DD" : "YYYY-MM");
    }

    protected buildFileStructure(excludedFolders: string[]) {
        this.fileEntryDates = [];

        this.app.vault
            .getFiles()
            .filter((file: TFile) => {
                return this.shouldIncludeFile(file, excludedFolders);
            })
            .sort((fileA: TFile, fileB: TFile): number => {
                const cacheA = this.app.metadataCache.getFileCache(fileA);
                const cacheB = this.app.metadataCache.getFileCache(fileB);
                const monthA = this.getDailyDate(fileA.stat.ctime, false, cacheA?.frontmatter);
                const monthB = this.getDailyDate(fileB.stat.ctime, false, cacheB?.frontmatter);
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

                const dayA = this.getDailyDate(fileA.stat.ctime, true, cacheA?.frontmatter);
                const dayB = this.getDailyDate(fileB.stat.ctime, true, cacheB?.frontmatter);
                return dayA > dayB ? -1 : dayA < dayB ? 1 : 0;
            })
            .forEach((file: TFile) => {
                const cache = this.app.metadataCache.getFileCache(file);
                const dailyDateString = this.getDailyDate(
                    file.stat.ctime,
                    true,
                    cache?.frontmatter);
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

