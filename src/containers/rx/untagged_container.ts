import { App, getAllTags, Menu, TFile } from "obsidian";
import { ObloggerSettings, ContainerSortMethod, getSortMethodDisplayText, RxGroupType } from "../../settings";
import { FileState } from "../../constants";
import { ContainerCallbacks } from "../container_callbacks";
import { RxContainer } from "./rx_container";

interface RenderedFile {
    file: TFile;
    mtime: number;
    ctime: number;
}

export class UntaggedContainer extends RxContainer {
    renderedFiles: RenderedFile[];

    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks
    ) {
        super(
            app,
            settings,
            callbacks,
            RxGroupType.UNTAGGED,
            false, // showStatusIcon,
            false // canCollapseInnerFolders
        );
    }

    protected wouldBeRendered(state: FileState): boolean {
        return state.tags.length === 0;
    }

    protected shouldRender(
      oldState: FileState,
      newState: FileState
    ): boolean {
        return this.shouldRenderBasedOnSortMethodSetting(oldState, newState);
    }

    protected getEmptyMessage(): string {
        return "No untagged documents";
    }

    protected getTextIcon(): string {
        return "alert-circle";
    }

    protected getTitleText(): string {
        return "Untagged";
    }

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSettings()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getPillIcon(): string {
        return this.getGroupSettings()?.sortAscending ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
    }

    protected getTitleTooltip(): string {
        return "Shows untagged notes";
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            this.addSortOptionsToMenu(
                menu,
                [
                    ContainerSortMethod.ALPHABETICAL,
                    ContainerSortMethod.CTIME,
                    ContainerSortMethod.MTIME
                ]
            );

            menu.showAtMouseEvent(e);
        }
    }

    protected addFileToFolder(file: TFile, remainingTag:string, pathPrefix:string) {
        this.renderedFiles.push({
            file: file,
            mtime: file.stat.mtime,
            ctime: file.stat.ctime
        });
        super.addFileToFolder(file, remainingTag, pathPrefix);
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
            .forEach((file: TFile) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache === null) {
                    return;
                }

                if ((getAllTags(cache)?.length ?? -1) === 0) {
                    this.addFileToFolder(
                        file,
                        "",
                        "/"
                    );
                }
            });
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        this.renderedFiles = [];

        const includedFiles = this.app.vault.getFiles().filter(file => {
            if (file.extension !== "md") {
                return false;
            }

            if (this.isFileExcluded(file, excludedFolders)) {
                return false;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            return cache !== null && ((getAllTags(cache)?.length ?? 1) <= 0);
        });

        switch (this.getGroupSettings()?.sortMethod) {
            case ContainerSortMethod.ALPHABETICAL:
                this.buildAlphabeticalFileStructure(
                    includedFiles,
                    this.getGroupSettings()?.sortAscending ?? true);
                break;
            case ContainerSortMethod.CTIME:
                this.buildDateFileStructure(
                    includedFiles,
                    this.getGroupSettings()?.sortAscending ?? true,
                    true);
                break;
            case ContainerSortMethod.MTIME:
                this.buildDateFileStructure(
                    includedFiles,
                    this.getGroupSettings()?.sortAscending ?? true,
                    false);
                break;
        }
    }
}

