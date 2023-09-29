import { ViewContainer } from "../view_container";
import { ObloggerSettings, RxGroupType } from "../../settings";
import { ContainerCallbacks } from "../container_callbacks";
import { App } from "obsidian";

export abstract class RxContainer extends ViewContainer {
    protected constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        groupType: RxGroupType,
        showStatusIcon: boolean,
        canCollapseInnerFolders: boolean
    ) {
        super(
            app,
            "", // viewName
            groupType,
            showStatusIcon,
            settings,
            true, // isMovable
            canCollapseInnerFolders,
            false, // canBePinned
            false, // isPinned
            callbacks
        )
    }

    protected getHideText(): string {
        return "Hide";
    }

    protected getHideIcon(): string {
        return "eye-off"
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getContainerClass(): string {
        return "rx-child";
    }
}
