import { App, FrontMatterCache, Menu, setIcon, TFile } from "obsidian";
import {FileClickCallback, GroupFolder, FileAddedCallback} from "./group_folder";
import { ObloggerSettings, RxGroupSettings } from "./settings";
import { buildStateFromFile, FileState } from "./constants";

interface RenderedFileCache {
    file: TFile;
    state: FileState
}

export abstract class ViewContainer extends GroupFolder {
    settings: ObloggerSettings;
    isMovable: boolean;
    canCollapseInnerFolders: boolean;
    canBePinned: boolean;
    isPinned: boolean;
    renderedFileCaches: RenderedFileCache[]

    fileClickCallback: FileClickCallback;
    fileAddedCallback: FileAddedCallback;
    requestRenderCallback: () => void;
    saveSettingsCallback: () => void;
    hideCallback: () => void;
    moveCallback: (up: boolean) => void;
    pinCallback: ((pin: boolean) => void) | undefined;

    protected abstract getTitleText(): string;
    protected abstract getTitleTooltip(): string;
    protected abstract getTextIcon(): string;
    protected abstract getTextIconTooltip(): string;
    protected abstract getPillText(): string;
    protected abstract getPillTooltipText(): string;
    protected abstract getPillIcon(): string;
    protected abstract buildFileStructure(excludedFolders: string[]): void;
    protected abstract getContainerClass(): string;
    protected abstract getPillClickHandler(): ((e: MouseEvent) => void) | undefined;
    protected abstract getHideText(): string;
    protected abstract getHideIcon(): string;
    protected abstract getEmptyMessage(): string;
    protected abstract wouldBeRendered(state: FileState): boolean;
    protected abstract shouldRender(
        oldState: FileState,
        newState: FileState
    ): boolean;

    protected constructor(
        app: App,
        viewName: string,
        fileClickCallback: FileClickCallback,
        fileAddedCallback: FileAddedCallback,
        collapseChangedCallback: (groupName: string, collapsedFolders: string[], save: boolean) => void,
        showStatusIcon: boolean,
        requestRenderCallback: () => void,
        settings: ObloggerSettings,
        saveSettingsCallback: () => void,
        getGroupIconCallback: (isCollapsed: boolean) => string,
        moveCallback: (up: boolean) => void,
        hideCallback: () => void,
        isMovable: boolean,
        canCollapseInnerFolders: boolean,
        canBePinned: boolean,
        pinCallback: ((pin: boolean) => void) | undefined,
        isPinned: boolean
    ) {
        super(
            app,
            viewName,
            "/",
            (save: boolean) => {
                collapseChangedCallback(viewName, this.getCollapsedFolders(), save);
            },
            showStatusIcon,
            getGroupIconCallback,
            () => { return this.getEmptyMessage() });

        this.settings = settings;
        this.isMovable = isMovable;
        this.canCollapseInnerFolders = canCollapseInnerFolders;
        this.canBePinned = canBePinned;
        this.isPinned = isPinned;

        this.fileClickCallback = fileClickCallback;
        this.fileAddedCallback = fileAddedCallback;
        this.requestRenderCallback = requestRenderCallback;
        this.saveSettingsCallback = saveSettingsCallback;
        this.hideCallback = hideCallback;
        this.moveCallback = moveCallback;
        this.pinCallback = pinCallback;
    }

    protected addFileToFolder(
      file: TFile,
      remainingTag: string,
      pathPrefix: string
    ) {
        const state = buildStateFromFile(this.app, file);
        this.renderedFileCaches.push({ file, state });

        super.addFileToFolder(file, remainingTag, pathPrefix);
    }

    protected isVisible(): boolean {
        return (this.getGroupSetting() as RxGroupSettings)?.isVisible ?? true;
    }

    protected getGroupSetting() {
        return (
            (this.settings.rxGroups.find(group => group.groupName === this.groupName)) ??
            (this.settings.tagGroups.find(group => group.tag === this.groupName))
        );
    }

    protected requestRender() {
        this.requestRenderCallback && this.requestRenderCallback();
    }

    protected getContextMenu() {
        const menu = new Menu();

        if (this.isMovable) {
            menu.addItem(item =>
                item
                    .setTitle("Move up")
                    .setIcon("arrow-up")
                    .setSection("movement")
                    .onClick(() => {
                        this.moveCallback(true)
                    })
            );

            menu.addItem(item =>
                item
                    .setTitle("Move down")
                    .setIcon("arrow-down")
                    .setSection("movement")
                    .onClick(() => {
                        this.moveCallback(false)
                    })
            );
        }

        if (this.canBePinned) {
            menu.addItem(item =>
                item
                    .setTitle(this.isPinned ? "Unpin" : "Pin")
                    .setIcon(this.isPinned ? "pin-off" : "pin")
                    .setSection("movement")
                    .onClick(() => {
                        this.pinCallback && this.pinCallback(!this.isPinned)
                    })
            );
        }

        if (this.canCollapseInnerFolders) {
            menu.addItem(item =>
                item
                    .setTitle("Collapse inner folders")
                    .setIcon("chevrons-down-up")
                    .setSection("collapsing")
                    .onClick(() => {
                        this.collapseInnerFolders();
                    })
            );
        }

        menu.addItem(item =>
            item
                .setTitle(this.getHideText())
                .setIcon(this.getHideIcon())
                .setSection("danger")
                .onClick(() => {
                    this.hideCallback()
                })
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                .setWarning(true)
        );
        return menu;
    }

    private collapseInnerFolders() {
        this.sortedSubFolders.forEach(folder => folder.setCollapsed(true, true));
    }

    private buildPinContainer(): HTMLElement {
        const pinDiv = document.createElement("div");
        pinDiv.addClass("pin");
        if (this.isPinned) {
            pinDiv.addClass("is-pinned");
        }
        setIcon(pinDiv, "chevrons-down");

        return pinDiv;
    }

    private buildTitleSvgHolder(): HTMLElement {
        const titleChevron = document.createElement("div");
        setIcon(titleChevron, "chevron-down");
        titleChevron.addClass("title-chevron");
        if (this.isPinned) {
            titleChevron.addClass("is-pinned");
        }
        titleChevron.addEventListener("click", () => {
            this.toggleCollapse();
        });

        titleChevron.appendChild(this.buildPinContainer());

        return titleChevron;
    }

    private buildTitleTextDiv(): HTMLElement {
        const textLabel = document.createElement("div");
        textLabel.addClass("text-label");

        const textIcon = document.createElement("div");
        setIcon(textIcon, this.getTextIcon());
        textIcon.addClass("text-icon");
        textIcon.ariaLabel = this.getTextIconTooltip();

        const titleText = document.createElement("div");
        titleText.addClass("title-text");
        titleText.appendChild(textLabel);
        titleText.appendChild(textIcon);

        titleText.addEventListener("click", () => {
            this.toggleCollapse();
        });

        textLabel.setText(this.getTitleText().toUpperCase());
        textLabel.addEventListener("contextmenu", (e) => {
            const contextMenu = this.getContextMenu();
            contextMenu && contextMenu.showAtMouseEvent(e);
        });
        textLabel.ariaLabel = this.getTitleTooltip();

        return titleText;
    }

    private buildPill(): HTMLElement {
        const titleTagDiv = document.createElement("div");
        titleTagDiv.addClass("title-tag");
        const pillTooltipText = this.getPillTooltipText();
        if (pillTooltipText.length > 0) {
            titleTagDiv.ariaLabel = pillTooltipText;
        }
        const pillClickHandler = this.getPillClickHandler();
        if (!pillClickHandler) {
            titleTagDiv.addClass("wiggle");
        }
        titleTagDiv.addEventListener("click", e => {
            e.stopPropagation();
            if (pillClickHandler) {
                pillClickHandler(e);
            }
        });

        const pillIcon = this.getPillIcon();
        pillIcon && setIcon(titleTagDiv, pillIcon);

        const tagLabelDiv = document.createElement("div");
        tagLabelDiv.addClass("tag-label");
        tagLabelDiv.setText(this.getPillText());
        titleTagDiv.appendChild(tagLabelDiv);

        return titleTagDiv;
    }

    protected buildTitle() {
        if (this.folderName !== "") {
            console.warn(`Unexpected folder name ${this.folderName}`)
        }

        this.titleContainer = document.createElement("div");
        this.titleContainer.addClass("title-container");

        this.titleContainer.appendChild(this.buildTitleSvgHolder());
        this.titleContainer.appendChild(this.buildTitleTextDiv());
        this.titleContainer.appendChild(this.buildPill());
    }

    rebuildFileStructure(excludedFolders: string[]) {
        // Clear
        this.sortedFiles = [];
        this.sortedSubFolders = [];
        this.renderedFileCaches = [];

        // Build
        this.buildFileStructure(excludedFolders);
    }

    public highlightFile(file: TFile) {
        Array.from(document.getElementsByClassName('child-item')).forEach(c => {
            if (c.getAttribute("data-path") === file.path) {
                c.addClass("active");
            } else {
                c.removeClass("active");
            }
        });
    }

    private frontmattersEqual(
        oldFrontmatter?: FrontMatterCache,
        newFrontmatter?: FrontMatterCache
    ) {
        if (oldFrontmatter === undefined && newFrontmatter === undefined) {
            return true;
        }
        if (oldFrontmatter === undefined || newFrontmatter === undefined) {
            return false;
        }

        const oldKeys = Object.keys(oldFrontmatter);
        const newKeys = Object.keys(newFrontmatter);
        if (oldKeys.length !== newKeys.length) {
            return false;
        }

        return !oldKeys.some(oldKey => {
            // skip over this key
            if (oldKey === "position") {
                return false;
            }
            return newFrontmatter[oldKey] !== oldFrontmatter[oldKey];
        });
    }

    private tagsEqual(oldTags: string[], newTags: string[]): boolean {
        if (oldTags.length !== newTags.length) {
            return false;
        }
        return !oldTags.some(oldTag => !newTags.contains(oldTag));
    }

    private shouldFileCauseRender(
        state: FileState,
        excludedFolders: string[]
    ): boolean {
        const isExcluded = excludedFolders.contains(state.path);
        const maybeCache = this.renderedFileCaches.find(
            renderedCache => renderedCache.file === state.file);

        // not excluded but no cache, only re-render if the file would be rendered
        if (!maybeCache && !isExcluded) {
            return this.wouldBeRendered(state);
        }

        // file is now excluded, and it either wasn't excluded or we have a cache
        const wasExcluded = excludedFolders.contains(maybeCache?.file.path ?? "");
        if (isExcluded && (!wasExcluded || !!maybeCache)) {
            return true;
        }

        // no cache or it's excluded, shouldn't need to re-render
        if (!maybeCache || isExcluded) {
            return false;
        }

        // name changes should always be reloaded
        if (maybeCache.state.basename !== state.basename) {
            return true;
        }

        // if the bookmark status changed, reload
        if (maybeCache.state.isBookmarked !== state.isBookmarked) {
            return true;
        }

        // frontmatter changes don't always need reloads, but might as well.
        // might want to be more discerning with this in the future.
        const oldFrontmatter = maybeCache.state.maybeMetadata?.frontmatter;
        const newFrontmatter = state.maybeMetadata?.frontmatter;
        if (!this.frontmattersEqual(oldFrontmatter, newFrontmatter)) {
            return true;
        }

        // tag changes don't always need reloads, but might as well.
        // might want to be more discerning with this in the future.
        const oldTags = maybeCache.state.tags;
        const newTags = state.tags;
        if (!this.tagsEqual(oldTags, newTags)) {
            return true;
        }

        // no generic decision to be made. ask the container if we should re-render
        return this.shouldRender(maybeCache.state, state);
    }

    public render(
        collapsedFolders: string[],
        excludedFolders: string[],
        modifiedFiles: FileState[],
        forced: boolean
    ) {
        if (!forced && modifiedFiles.length > 0) {
            if (!modifiedFiles.some(state => {
                return this.shouldFileCauseRender(state, excludedFolders);
            })) {
                console.log(`skipping rendering of ${this.groupName}`)
                return;
            }
        }
        console.log(`rendering ${this.groupName}`)

        this.rebuildFileStructure(excludedFolders);

        if (this.isVisible()) {
            this.rootElement.removeClass("hidden");
        } else {
            this.rootElement.addClass("hidden");
        }

        super.rebuild(
            collapsedFolders,
            this.fileClickCallback,
            this.fileAddedCallback
        );

        this.rootElement.setAttribute("group-name", this.groupName);
        this.rootElement.setAttribute("tag-group-tag", this.groupName);
        this.rootElement.addClass(this.getContainerClass());

        this.contentContainer.removeClass("family-content");
        this.contentContainer.addClass("content");
    }
}

