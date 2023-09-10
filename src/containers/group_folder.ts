import {
    App,
    ExtraButtonComponent,
    getAllTags,
    setIcon,
    TFile
} from "obsidian";
import { getFileTypeIcon } from "../settings";
import { isBookmarked } from "../constants";

const COLLAPSED_CLASS_IDENTIFIER = "collapsed";

export type FileClickCallback = (file: TFile, isCtrlCmdKeyDown: boolean) => void;
export type FileAddedCallback = (
    file: TFile,
    contentItem: HTMLElement) => void;

declare module "obsidian" {
    interface Plugin {
        instance: never;
    }
    interface App {
        internalPlugins: {
            plugins: { [key: string]: {
                instance: {
                    items: {
                        type: string;
                        path: string;
                    }[]
                }
            } }
        }
    }
}

export class GroupFolder {
    app: App;

    groupName: string;

    folderPath: string;
    folderName: string;

    showStatusIcon: boolean;

    sortedSubFolders: GroupFolder[];
    sortedFiles: TFile[];

    rootElement: HTMLElement;
    titleContainer: HTMLElement;
    contentContainer: HTMLElement;

    collapseChangedCallback: (save: boolean) => void;
    getGroupIconCallback: (isCollapsed: boolean) => string;
    getEmptyMessageCallback: () => string;

    constructor(
        app: App,
        groupName: string,
        folderPath: string,
        collapseChangedCallback: (save: boolean) => void,
        showStatusIcon: boolean,
        getGroupIconCallback: (isCollapsed: boolean) => string,
        getEmptyMessageCallback: () => string
    ) {
        this.app = app;
        this.groupName = groupName;
        this.folderPath = folderPath;
        this.folderName = folderPath.split("/").last() ?? "";
        this.showStatusIcon = showStatusIcon;
        this.sortedFiles = [];
        this.sortedSubFolders = [];
        this.collapseChangedCallback = collapseChangedCallback;
        this.getGroupIconCallback = getGroupIconCallback;
        this.getEmptyMessageCallback = getEmptyMessageCallback;

        this.rootElement = document.createElement("div");
        this.rootElement.addClass("folder-holder")
    }

    protected hasFileWithin(file: TFile): boolean {
        return this.sortedFiles.contains(file) || this.sortedSubFolders.some(subFolder => subFolder.hasFileWithin(file));
    }

    public getCollapsedFolders(): string[] {
        return (this.isCollapsed() ? [this.folderPath] : [])
            .concat(this.sortedSubFolders.flatMap(f => f.getCollapsedFolders()));
    }

    protected rebuild(
        collapsedFolders: string[],
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
    ) {
        // Clear
        this.rootElement.empty();

        // Build
        this.build(
            collapsedFolders,
            fileClickCallback,
            fileAddedCallback,
            0);
    }

    protected buildTitle(
        isCollapsed: boolean,
        recursionDepth: number
    ) {
        this.titleContainer = document.createElement("div");
        this.titleContainer.addClass("family-title");
        this.titleContainer.style.marginLeft = `-${12+17*recursionDepth}px`
        this.titleContainer.style.paddingLeft = `${16+17*recursionDepth}px`
        this.titleContainer.setAttribute("familyName", this.folderName);
        this.titleContainer.setAttribute(
            "tag-group-tag",
            this.groupName,
        );

        const groupTitleText = document.createElement("div");
        groupTitleText.addClass("family-title-text");
        groupTitleText.setText(this.folderName);

        const groupTitleIcon = document.createElement("div");
        new ExtraButtonComponent(groupTitleIcon)
            .setIcon(this.getGroupIconCallback(isCollapsed))
            .extraSettingsEl.addClass("child-folder-icon");

        this.titleContainer.appendChild(groupTitleIcon);
        this.titleContainer.appendChild(groupTitleText);

        this.titleContainer.addEventListener("click", () => {
            this.toggleCollapse();

            groupTitleIcon.empty();
            new ExtraButtonComponent(groupTitleIcon)
                .setIcon(this.getGroupIconCallback(this.isCollapsed()))
                .extraSettingsEl.addClass("child-folder-icon");
        });
    }

    private build(
        collapsedFolders: string[],
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        recursionDepth: number
    ): void {
        const isCollapsed = collapsedFolders.contains(this.folderPath);
        // Build the title
        this.buildTitle(isCollapsed, recursionDepth - 1);

        // Add the title
        this.rootElement.appendChild(this.titleContainer);

        // Build the content
        this.buildContent(
            collapsedFolders,
            fileClickCallback,
            fileAddedCallback,
            recursionDepth);

        // Add the content
        this.rootElement.appendChild(this.contentContainer);

        // Collapse if necessary
        if (isCollapsed) {
            this.setCollapsed(true, false);
        }
    }

    private buildContent(
        collapsedFolders: string[],
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        recursionDepth: number
    ) {
        this.contentContainer = document.createElement("div");
        this.contentContainer.addClass("family-content");

        if (this.sortedSubFolders.length === 0 && this.sortedFiles.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.addClass("empty-rx-message");
            emptyDiv.setText(this.getEmptyMessageCallback());
            this.contentContainer.appendChild(emptyDiv);
        } else {
            this.sortedSubFolders.forEach((subFolder) => {
                subFolder.build(
                    collapsedFolders,
                    fileClickCallback,
                    fileAddedCallback,
                    recursionDepth + 1);
                this.contentContainer.appendChild(subFolder.rootElement);
            });

            this.sortedFiles
                .forEach(file => {
                    this.contentContainer.appendChild(
                        this.buildFileElement(
                            file,
                            fileClickCallback,
                            fileAddedCallback,
                            recursionDepth));
                });
        }
    }

    protected sortFilesByName(fileA: TFile, fileB: TFile): number {
        const nameA = fileA.name.toLowerCase();
        const nameB = fileB.name.toLowerCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    }

    protected sortFilesByBookmark(fileA: TFile, fileB: TFile): number {
        const isABookmarked = isBookmarked(this.app, fileA);
        const isBBookmarked = isBookmarked(this.app, fileB);
        return (
            isABookmarked && !isBBookmarked ? -1 :
            !isABookmarked && isBBookmarked ? 1 : 0
        );
    }

    private buildFileElement(
        file: TFile,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        recursionDepth: number
    ) {
        const cache = this.app.metadataCache.getFileCache(file);
        const maybeFrontmatter = cache?.frontmatter;

        const fileTooltipText = `${file.path}

Last modified at ${window.moment(file.stat.mtime).format("YYYY-MM-DD HH:mm")}
Created at ${window.moment(file.stat.ctime).format("YYYY-MM-DD HH:mm")}`;

        const root_childItem = document.createElement("div");
        root_childItem.addClass("child-item");
        root_childItem.style.marginLeft = `-${12+17*recursionDepth}px`
        root_childItem.style.paddingLeft = `${16+17*recursionDepth}px`
        root_childItem.addEventListener("click", (e) => {
            fileClickCallback(file, e.metaKey || e.ctrlKey);
        });

        const statusIconDiv = document.createElement("div");
        statusIconDiv.addClass("status-icon");
        setIcon(statusIconDiv, "circle");

        if (
            this.showStatusIcon &&
            cache && (getAllTags(cache)?.length ?? -1) === 0 &&
            file.extension === "md"
        ) {
            statusIconDiv.addClass("visible");
            statusIconDiv.ariaLabel = "Untagged";
        }

        root_childItem.appendChild(statusIconDiv);

        new ExtraButtonComponent(root_childItem)
            .setIcon(maybeFrontmatter?.icon ?? getFileTypeIcon(file)).setDisabled(true)
            .extraSettingsEl.addClass("child-item-icon");

        const childItemText = document.createElement("div");
        childItemText.addClass("child-item-text");
        childItemText.setText((maybeFrontmatter?.alias || maybeFrontmatter?.aliases) ?? file.basename);
        childItemText.ariaLabel = fileTooltipText;
        root_childItem.appendChild(childItemText);

        const bookmarkIcon = document.createElement("div");
        bookmarkIcon.addClass("bookmark-icon");
        if (isBookmarked(this.app, file)) {
            setIcon(bookmarkIcon, "bookmark");
            bookmarkIcon.ariaLabel = "Bookmarked";
        }
        root_childItem.appendChild(bookmarkIcon);

        if (file.extension.toLowerCase() !== "md") {
            const childItemTypePill = document.createElement("div");
            childItemTypePill.addClass("nav-file-tag");
            childItemTypePill.setText(file.extension.toUpperCase());
            root_childItem.appendChild(childItemTypePill);
        }

        root_childItem.setAttribute("data-path", file.path);

        // This callback is here to handle context menu building at the view level
        fileAddedCallback(file, root_childItem);

        return root_childItem;
    }

    public setCollapsed(collapsed: boolean, save: boolean): void {
        const willChange = (collapsed !== this.isCollapsed());

        if (collapsed) {
            this.titleContainer.addClass(COLLAPSED_CLASS_IDENTIFIER);
            this.contentContainer.addClass(COLLAPSED_CLASS_IDENTIFIER);
        } else {
            this.titleContainer.removeClass(COLLAPSED_CLASS_IDENTIFIER);
            this.contentContainer.removeClass(COLLAPSED_CLASS_IDENTIFIER);
        }

        if (willChange) {
            this.collapseChangedCallback(save);
        }
    }

    public isCollapsed(): boolean {
        if (!this.titleContainer || !this.contentContainer) {
            return false;
        }
        if(this.titleContainer.hasClass(COLLAPSED_CLASS_IDENTIFIER) !== this.contentContainer.hasClass(COLLAPSED_CLASS_IDENTIFIER)) {
            console.warn("Title and content collapse states are out of sync!")
        }
        return this.titleContainer.hasClass(COLLAPSED_CLASS_IDENTIFIER);
    }

    public toggleCollapse(): void {
        this.setCollapsed(!this.isCollapsed(), true);
    }

    protected addFileToFolder(
        file: TFile,
        remainingTag: string,
        pathPrefix: string
    ) {
        if (remainingTag.length === 0) {
            this.sortedFiles.push(file);
            return;
        }
        const tagPathParts = remainingTag.split("/");
        const folderName = tagPathParts[0];
        const fullPath = `${pathPrefix}/${folderName}`;
        let subFolder = this.sortedSubFolders.find(
            (f) => f.folderPath === fullPath);
        if (!subFolder) {
            subFolder = new GroupFolder(
                this.app,
                this.groupName,
                fullPath,
                this.collapseChangedCallback,
                this.showStatusIcon,
                this.getGroupIconCallback,
                this.getEmptyMessageCallback);
            this.sortedSubFolders.push(subFolder);
        }
        subFolder && subFolder.addFileToFolder(
            file,
            tagPathParts.slice(1).join("/"),
            fullPath);
    }
}
