import { OtcContainer } from "./otc_container";
import { ContainerCallbacks } from "../container_callbacks";
import { ContainerSortMethod, ObloggerSettings, OtcGroupType } from "../../settings";
import { App, Menu, TFile, TFolder } from "obsidian";
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
            isPinned,
            false // showStatusIcon
        );

        this.basePath = basePath;
    }

    private addAllFilesIn(
        folder: TFolder,
        excludedFolders: string[],
        sortAscending: boolean,
        fileSortingFn: (fileA: TFile, fileB: TFile) => number
    ): void {
        const rootFolderLength = this.basePath === "/" ? 0 : (this.basePath.length + 1);
        const adjustedFolderPath = folder.path === "/" ? "" : folder.path.slice(rootFolderLength);

        const subFolders: TFolder[] = folder.children
            .filter(abstractFile => {
                return abstractFile instanceof TFolder;
            }).map(abstractFile => {
                return abstractFile as TFolder;
            });

        const subFiles = folder.children
            .filter(abstractFile => {
                return (
                    abstractFile instanceof TFile &&
                    !this.isFileExcluded(abstractFile, excludedFolders)
                );
            }).map(abstractFile => {
                return abstractFile as TFile;
            }).sort((fileA, fileB) => {
                const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                if (bookmarkSorting != 0) {
                    return bookmarkSorting;
                }
                return (sortAscending ? 1 : -1) * fileSortingFn(fileA, fileB);
            });

        subFiles.forEach((file: TFile) => {
            this.addFileToFolder(file, adjustedFolderPath, "");
        });

        subFolders.forEach((folder: TFolder) => {
            this.addAllFilesIn(
                folder,
                excludedFolders,
                sortAscending,
                fileSortingFn);
        });
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        const abstractFile = this.app.vault.getAbstractFileByPath(this.basePath);
        if (!(abstractFile instanceof TFolder)) {
            console.warn(`Unable to build container for ${this.basePath}. It is not a folder.`)
            return;
        }

        const ascending = this.getGroupSettings()?.sortAscending ?? true;
        const sortMethod = this.getGroupSettings()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL;
        const fileSortingFn = this.getFileSortingFn(sortMethod);

        this.addAllFilesIn(abstractFile, excludedFolders, ascending, fileSortingFn);
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            this.addSortOptionsToMenu(
                menu,
                [ ContainerSortMethod.ALPHABETICAL ]
            );

            menu.showAtMouseEvent(e);
        }
    }

    protected getTextIcon(isCollapsed: boolean): string {
        return isCollapsed ? "folder-closed" : "folder-open";
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
        return this.basePath;
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
