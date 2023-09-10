import { ObloggerSettings, ContainerSortMethod, getSortMethodDisplayText, RxGroupType, getFileType } from "../../settings";
import { App, Menu, TFile } from "obsidian";
import { FileState } from "../../constants";
import { ContainerCallbacks } from "../container_callbacks";
import { RxContainer } from "./rx_container";

export class FilesContainer extends RxContainer {
    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks
    ) {
        // Override the default behavior with special packaging
        callbacks.getGroupIconCallback = (isCollapsed) => isCollapsed ? "package" : "package-open";

        super(
            app,
            settings,
            callbacks,
            RxGroupType.FILES,
            false, // showStatusIcon,
            true // canCollapseInnerFolders
        );
    }

    protected wouldBeRendered(state: FileState): boolean {
        return state.extension !== "md";
    }

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        return this.shouldRenderBasedOnSortMethodSetting(oldState, newState);
    }

    protected getEmptyMessage(): string {
        return "No special files";
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getPillIcon(): string {
        return this.getGroupSetting()?.sortAscending ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
    }

    protected getTitleText(): string {
        return "Files";
    }

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            this.addSortOptionsToMenu(
                menu,
                [
                    ContainerSortMethod.ALPHABETICAL,
                    ContainerSortMethod.CTIME,
                    ContainerSortMethod.MTIME,
                    ContainerSortMethod.TYPE,
                    ContainerSortMethod.EXTENSION
                ]
            );

            menu.showAtMouseEvent(e);
        }
    }

    private buildAlphabeticalFileStructure(
        unsortedFiles: TFile[],
        ascending: boolean
    ): void {
        unsortedFiles
            .sort((fileA: TFile, fileB: TFile) => {
                const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                if (bookmarkSorting != 0) {
                    return bookmarkSorting;
                }
                return (ascending ? 1 : -1) * this.sortFilesByName(fileA, fileB);
            })
            .forEach(file => {
                this.addFileToFolder(
                    file,
                    "",
                    "/"
                );
            });
    }

    private buildExtensionFileStructure(unsortedFiles: TFile[], ascending: boolean) {
        unsortedFiles.sort((fileA: TFile, fileB: TFile) => {
            if (fileA.extension != fileB.extension) {
                return (ascending ? 1 : -1) * (fileA.extension < fileB.extension ? -1 : 1);
            }

            const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
            if (bookmarkSorting != 0) {
                return bookmarkSorting;
            }

            return this.sortFilesByName(fileA, fileB);
        }).forEach(file => {
            this.addFileToFolder(file, file.extension, "/")
        });
    }

    private buildTypeFileStructure(unsortedFiles: TFile[], ascending: boolean) {
        unsortedFiles.sort((fileA: TFile, fileB: TFile) => {
            const aType = getFileType(fileA.extension) ?? "unknown";
            const bType = getFileType(fileB.extension) ?? "unknown";
            if (aType != bType) {
                return (ascending ? 1 : -1) * (aType < bType ? -1 : 1);
            }

            const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
            if (bookmarkSorting != 0) {
                return bookmarkSorting;
            }

            return this.sortFilesByName(fileA, fileB);
        }).forEach(file => {
            this.addFileToFolder(file, getFileType(file.extension) ?? "unknown", "/")
        })
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        const includedFiles = this.app.vault.getFiles().filter(file => {

            if (this.isFileExcluded(file, excludedFolders)) {
                return false;
            }

            return file.extension !== "md";
        });

        const ascending = this.getGroupSetting()?.sortAscending ?? true;

        switch (this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.TYPE) {
            case ContainerSortMethod.ALPHABETICAL:
                this.buildAlphabeticalFileStructure(includedFiles, ascending);
                break;
            case ContainerSortMethod.CTIME:
                this.buildDateFileStructure(includedFiles, ascending, true);
                break;
            case ContainerSortMethod.MTIME:
                this.buildDateFileStructure(includedFiles, ascending, false);
                break;
            case ContainerSortMethod.EXTENSION:
                this.buildExtensionFileStructure(includedFiles, ascending);
                break;
            case ContainerSortMethod.TYPE:
            default:
                this.buildTypeFileStructure(includedFiles, ascending);
                break;
        }
    }
}
