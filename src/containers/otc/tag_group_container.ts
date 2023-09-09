import { App, getAllTags, Menu, TFile } from "obsidian";
import { ViewContainer } from "../view_container";
import { ContainerSortMethod, getSortMethodDisplayText, GroupSettings, ObloggerSettings } from "../../settings";
import { FileState } from "../../constants";
import { ContainerCallbacks } from "../container_callbacks";


type TagFileMap = { [key: string]: TFile[] };

interface FileTags {
    file: TFile;
    tags: string[];
}

export class TagGroupContainer extends ViewContainer {
    renderedFileTags: FileTags[];

    constructor(
        app: App,
        baseTag: string,
        settings: ObloggerSettings,
        isPinned: boolean,
        callbacks: ContainerCallbacks
    ) {
        super(
            app,
            baseTag,
            false, // showStatusIcon
            settings,
            false, // isMovable
            true, // canCollapseInnerFolders
            true, // canBePinned
            isPinned,
            callbacks
        );
    }

    protected getGroupSetting(): GroupSettings | undefined {
        // override to search otcGroups instead of rxGroups
        return this.settings.otcGroups.find(group => group.groupName === this.groupName);
    }

    protected wouldBeRendered(state: FileState): boolean {
        // if we don't have metadata, then it's not going to be rendered
        if (!state.maybeMetadata) {
            return false;
        }
        // this code is duplicated below. it checks if the group name (tag) is
        // included somewhere in the tags
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);
        return (getAllTags(state.maybeMetadata)
            ?.map(tag => tag.replace("#", ""))
            ?.unique()
            ?.filter((tag: string) => {
                if (isolatedGroupName) {
                    return tag.contains(isolatedGroupName);
                } else {
                    const nestDepth = this.groupName.split("/").length;
                    return tag.split("/").slice(0, nestDepth).join("/") === this.groupName;
                }
            }).length ?? 0) > 0;
    }

    protected shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean {
        return this.shouldRenderBasedOnSortMethodSetting(oldState, newState);
    }

    protected getEmptyMessage(): string {
        return "";
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

    private getIsolatedTagMatch(): RegExpMatchArray | null {
        return this.groupName.match("\\.\\.\\./(.*)/\\.\\.\\.");
    }

    protected getTitleText(): string {
        const match = this.getIsolatedTagMatch();
        if (match) {
            return `${match[1]}`
        } else {
            return this.groupName.split("/").last() ?? ""
        }
    }

    protected getTextIcon(): string {
        if (this.getIsolatedTagMatch()) {
            return "tags";
        }
        return "";
    }

    protected getTextIconTooltip(): string {
        return this.getIsolatedTagMatch() ? "Nested within multiple tags" : "";
    }

    protected getPillText(): string {
        return getSortMethodDisplayText(this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL);
    }

    protected getPillTooltipText(): string {
        return "Sort";
    }

    protected getTitleTooltip(): string {
        if (this.getIsolatedTagMatch()) {
            return "Associated tags:\n\n" + Object.keys(this.getAllAssociatedTags([]))
                .sort()
                .map(tag => `#${tag}`)
                .join("\n");
        }
        return `#${this.groupName}`;
    }

    protected getPillIcon(): string {
        return (this.getGroupSetting()?.sortAscending ?? true) ?
            "down-arrow-with-tail" :
            "up-arrow-with-tail"
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

    private getFileTags(
        file: TFile,
        excludedFolders: string[],
        isolatedGroupName: string | undefined
    ): FileTags | null {
        // filter out excluded
        if (this.isFileExcluded(file, excludedFolders)) {
            return null;
        }
        const cache = this.app.metadataCache.getFileCache(file);
        // filter out files missing cache
        if (cache === null) {
            return null;
        }
        const tags = getAllTags(cache)
            ?.map(tag => tag.replace("#", ""))
            ?.unique()
            ?.filter((tag: string) => {
                if (isolatedGroupName) {
                    return tag.contains(isolatedGroupName);
                } else {
                    const nestDepth = this.groupName.split("/").length;
                    return tag.split("/").slice(0, nestDepth).join("/") === this.groupName;
                }
            });
        if (!tags?.length) {
            return null;
        }
        return { file, tags };
    }

    private getAllAssociatedTags(excludedFolders: string[]): TagFileMap {
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);

        // This is pretty confusing bit of code. we're first getting all files
        // and their tags (wrapped in special objects and saved to `renderedFileTags`,
        // and then inverted to be a map of tag to list of files associated with
        // that tag.
        this.renderedFileTags = this.app.vault
            .getMarkdownFiles()
            .map(file => this.getFileTags(file, excludedFolders, isolatedGroupName))
            .filter(item => item !== null) as FileTags[];
        return this.renderedFileTags
            .reduce((acc: TagFileMap, item: FileTags) => {
                item.tags.forEach((tag: string) => {
                    if (!Object.keys(acc).contains(tag)) {
                        acc[tag] = [];
                    }
                    acc[tag].push(item.file);
                });
                return acc;
            }, {});
    }

    private getFileSortingFn(sortMethod: string) {
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

    protected buildFileStructure(excludedFolders: string[]) {
        // clear the cache
        this.renderedFileTags = [];

        const tagFiles = this.getAllAssociatedTags(excludedFolders);
        const isolatedGroupName = this.getIsolatedTagMatch()?.at(1);
        const ascending = this.getGroupSetting()?.sortAscending ?? true;
        const sortMethod = this.getGroupSetting()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL;
        const fileSortingFn = this.getFileSortingFn(sortMethod);

        Object.keys(tagFiles).sort((tagA: string, tagB: string) => {
            // don't always sort tags. only sort them if sorting is alphabetical,
            // otherwise default to alpha ascending
            const modifier = sortMethod === ContainerSortMethod.ALPHABETICAL ? (ascending ? 1 : -1) : 1;
            return modifier * (tagA < tagB ? -1 : tagA > tagB ? 1 : 0);
        }).forEach((tag: string) => {
            const subTag = tag.replace(this.groupName, "");
            tagFiles[tag]
                .sort((fileA: TFile, fileB: TFile) => {
                    const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                    if (bookmarkSorting != 0) {
                        return bookmarkSorting;
                    }
                    return (ascending ? 1 : -1) * fileSortingFn(fileA, fileB);
                })
                .forEach((file: TFile) => {
                    let remainingTag = subTag.startsWith("/") ? subTag.slice(1) : subTag;
                    if (isolatedGroupName) {
                        if (remainingTag.endsWith(isolatedGroupName)) {
                            remainingTag = remainingTag.replace(isolatedGroupName, "")
                        } else if (remainingTag.contains(isolatedGroupName)) {
                            remainingTag = remainingTag.split("/").last() ?? "";
                        }
                    }
                    this.addFileToFolder(
                        file,
                        remainingTag.startsWith("/") ? remainingTag.slice(1) : remainingTag,
                        "/"
                    );
                });
        });
    }

    protected getContainerClass(): string {
        return "otc-child";
    }
}
