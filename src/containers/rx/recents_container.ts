import { ViewContainer } from "../view_container";
import { App, Menu } from "obsidian";
import { ObloggerSettings, RxGroupType } from "../../settings";
import { FileState } from "../../constants";
import { ContainerCallbacks } from "../container_callbacks";

const RECENT_COUNT_OPTIONS = [5, 10, 15];

export class RecentsContainer extends ViewContainer {
    recentsCount = 10;

    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks
    ) {
        super(
            app,
            RxGroupType.RECENTS,
            true,
            settings,
            true, // isMovable
            false, // canCollapseInnerFolders
            false, // canBePinned
            false, // isPinned
            callbacks);

        this.recentsCount = settings.recentsCount;
    }

    protected wouldBeRendered(): boolean {
        // We would always render a single file
        return true;
    }

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        return oldState.mtime !== newState.mtime && this.sortedFiles.first() !== newState.file;
    }

    protected getEmptyMessage(): string {
        return "No recents";
    }

    protected getHideText(): string {
        return "Hide";
    }

    protected getHideIcon(): string {
        return "eye-off"
    }

    protected getTitleText(): string {
        return "Recents";
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
        return `Last ${this.recentsCount}`;
    }

    protected getPillTooltipText(): string {
        return `Change number of recents`;
    }

    protected getPillIcon(): string {
        return "";
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined{
        return (e: MouseEvent) => {
            const menu = new Menu();
            RECENT_COUNT_OPTIONS.forEach(amount => {
                menu.addItem(item => {
                    item.setTitle(amount.toString());
                    item.onClick(() => {
                        this.recentsCount = amount;
                        this.requestRender();
                        this.settings.recentsCount = amount;
                        return this.callbacks.saveSettingsCallback();
                    });
                    item.setIcon(this.recentsCount === amount ? "check" : "");
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.iconEl.addClass("oblogger-pill-menu-icon");
                });
            });
            menu.showAtMouseEvent(e);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            menu.dom.addClass("oblogger-pill-menu");
        }
    }

    protected getContainerClass(): string {
        return "rx-child";
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        console.log(excludedFolders)
        let foundFilesCount = 0;
        this.app.vault
            .getFiles()
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .forEach(file => {
                // early bail out if we've found enough files
                if (foundFilesCount >= this.recentsCount) {
                    return;
                }
                if (this.isFileExcluded(file, excludedFolders)) {
                    return;
                }
                this.addFileToFolder(
                    file,
                    "",
                    "/"
                );
                foundFilesCount += 1;
            });
    }
}

