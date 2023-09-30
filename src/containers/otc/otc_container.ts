import { ViewContainer } from "../view_container";
import { ContainerSortMethod, getSortMethodDisplayText, ObloggerSettings, OtcGroupType } from "../../settings";
import { ContainerCallbacks } from "../container_callbacks";
import { App, TFile } from "obsidian";
import { FileState } from "../../constants";

export abstract class OtcContainer extends ViewContainer {
    protected constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        groupType: OtcGroupType,
        groupName: string,
        isPinned: boolean,
        showStatusIcon: boolean
    ) {
        super(
            app,
            groupName,
            groupType,
            showStatusIcon,
            settings,
            false, // isMovable
            true, // canCollapseInnerFolders
            true, // canBePinned
            isPinned,
            callbacks
        );
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

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSettings()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getPillIcon(): string {
        return (this.getGroupSettings()?.sortAscending ?? true) ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
    }

    protected getContainerClass(): string {
        return "otc-child";
    }

    protected getFileSortingFn(sortMethod: string) {
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

    protected getEmptyMessage(): string {
        return "";
    }

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        return this.shouldRenderBasedOnSortMethodSetting(oldState, newState);
    }
}
