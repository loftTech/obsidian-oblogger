import { ViewContainer } from "../view_container";
import { ObloggerSettings } from "../../settings";
import { ContainerCallbacks } from "../container_callbacks";
import { App } from "obsidian";

export abstract class RxContainer extends ViewContainer {
    protected constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        groupType: string,
        showStatusIcon: boolean,
        canCollapseInnerFolders: boolean
    ) {
        super(
            app,
            groupType, // viewName
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

    protected getTextIcon(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getContainerClass(): string {
        return "rx-child";
    }
}
