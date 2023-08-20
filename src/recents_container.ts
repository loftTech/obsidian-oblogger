import { FileClickCallback, FileAddedCallback } from "./group_folder";
import { ViewContainer } from "./view_container";
import { App, Menu } from "obsidian";
import { ObloggerSettings, RxGroupType } from "./settings";
import { FileModificationEventDetails } from "./constants";

const RECENT_COUNT_OPTIONS = [5, 10, 15];

export class RecentsContainer extends ViewContainer {
    recentsCount = 10;

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
            RxGroupType.RECENTS,
            fileClickCallback,
            fileAddedCallback,
            collapseChangedCallback,
            true,
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

        this.recentsCount = settings.recentsCount;
    }

    protected wouldBeRendered(state: FileModificationEventDetails): boolean {
        // We would always render a single file
        return true;
    }

    protected shouldRender(
        oldState: FileModificationEventDetails,
        newState: FileModificationEventDetails
    ): boolean {
        return false;
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
                        this.saveSettingsCallback();
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
        this.app.vault
            .getFiles()
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, this.recentsCount)
            .forEach(file => {
                if (file.parent && excludedFolders.contains(file.parent.path)) {
                    return;
                }
                this.addFileToFolder(
                    file,
                    "",
                    "/"
                );
            });
    }
}

