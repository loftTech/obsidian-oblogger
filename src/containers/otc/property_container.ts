import { ContainerCallbacks } from "../container_callbacks";
import { ObloggerSettings, OtcGroupType } from "../../settings";
import { App } from "obsidian";
import { OtcContainer } from "./otc_container";
import { FileState } from "../../constants";

export class PropertyContainer extends OtcContainer {
    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        propertyName: string,
        isPinned: boolean
    ) {
        super(
            app,
            settings,
            callbacks,
            OtcGroupType.PROPERTY_GROUP,
            propertyName, // groupName
            isPinned
        );
    }

    protected buildFileStructure(excludedFolders: string[]): void {
    }

    protected getTextIcon(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getTitleText(): string {
        return this.groupName;
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected wouldBeRendered(state: FileState): boolean {
        return false;
    }
}
