import { OtcContainer } from "./otc_container";
import { ContainerCallbacks } from "../container_callbacks";
import { ObloggerSettings, OtcGroupType } from "../../settings";
import { App, TFile, TFolder } from "obsidian";
import { FileState } from "../../constants";

export class FolderContainer extends OtcContainer {
    basePath: string;

    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        basePath: string,
        isPinned: boolean
    ) {
        super(
            app,
            settings,
            callbacks,
            OtcGroupType.FOLDER_GROUP,
            basePath, // groupName,
            isPinned
        );

        this.basePath = basePath;
    }

    private addAllFilesIn(folder: TFolder, excludedFolders: string[]): void {
        folder.children.forEach(abstractFile => {
            if (abstractFile instanceof TFile) {
                if (this.isFileExcluded(abstractFile, excludedFolders)) {
                    return;
                }
                this.addFileToFolder(
                    abstractFile,
                    abstractFile.path.split("/").slice(0, -1).join("/"),
                    "");
            } else if (abstractFile instanceof TFolder) {
                this.addAllFilesIn(abstractFile, excludedFolders);
            }
        })
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        const abstractFile = this.app.vault.getAbstractFileByPath(this.basePath);
        if (!(abstractFile instanceof TFolder)) {
            console.warn(`Unable to build container for ${this.basePath}. It is not a folder.`)
            return;
        }
        this.addAllFilesIn(abstractFile, excludedFolders);
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return undefined;
        // todo
    }

    protected getTextIcon(): string {
        return "folder";
        // todo
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getTitleText(): string {
        if(this.basePath === "/") {
            return this.app.vault.getName();
        }
        return this.basePath.split("/").last() ?? this.basePath;
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected wouldBeRendered(state: FileState): boolean {
        let currentFolder = state.file.parent;
        while (currentFolder) {
            if (currentFolder.path === this.basePath) {
                return true;
            }
            currentFolder = currentFolder.parent;
        }
        return false;
    }
}
