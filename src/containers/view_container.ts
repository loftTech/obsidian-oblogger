import { App, FrontMatterCache, Menu, setIcon, TFile } from "obsidian";
import { GroupFolder } from "./group_folder";
import { GroupSettings, ObloggerSettings } from "../settings";
import { buildStateFromFile, FileState } from "../constants";
import { FolderSuggestModal } from "../folder_suggest_modal";
import { ContainerCallbacks } from "./container_callbacks";

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

    callbacks: ContainerCallbacks;

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
        showStatusIcon: boolean,
        settings: ObloggerSettings,
        isMovable: boolean,
        canCollapseInnerFolders: boolean,
        canBePinned: boolean,
        isPinned: boolean,
        callbacks: ContainerCallbacks
    ) {
        super(
            app,
            viewName,
            "/",
            (save: boolean) => {
                callbacks.collapseChangedCallback(viewName, this.getCollapsedFolders(), save);
            },
            showStatusIcon,
            callbacks.getGroupIconCallback,
            () => { return this.getEmptyMessage() });

        this.settings = settings;
        this.isMovable = isMovable;
        this.canCollapseInnerFolders = canCollapseInnerFolders;
        this.canBePinned = canBePinned;
        this.isPinned = isPinned;
        this.callbacks = callbacks;
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
        return this.getGroupSetting()?.isVisible ?? true;
    }

    protected getGroupSetting(): GroupSettings | undefined {
        // default to fetching from rx groups. override in TagGroupContainer
        // to fetch from otc groups.
        return this.settings.rxGroups.find(group => group.groupName === this.groupName);
    }

    protected requestRender() {
        this.callbacks.requestRenderCallback && this.callbacks.requestRenderCallback();
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
                        this.callbacks.moveCallback(true)
                    })
            );

            menu.addItem(item =>
                item
                    .setTitle("Move down")
                    .setIcon("arrow-down")
                    .setSection("movement")
                    .onClick(() => {
                        this.callbacks.moveCallback(false)
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
                        this.callbacks.pinCallback && this.callbacks.pinCallback(!this.isPinned)
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

        const groupSetting = this.getGroupSetting();

        menu.addItem(item => {
            item
                .setTitle("Folder exclusions")
                .setSection("exclusions")
                .setIcon("folder-x");

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const subMenu = item.setSubmenu() as Menu;
            subMenu.addItem(subItem => {
                subItem
                    .setTitle(`${groupSetting?.templatesFolderVisible ? "Hide" : "Show"} templates`)
                    .setIcon(groupSetting?.templatesFolderVisible ? "eye-off" : "eye")
                    .setSection("hide")
                    .onClick(async () => {
                        if (groupSetting) {
                            groupSetting.templatesFolderVisible = !groupSetting.templatesFolderVisible;
                            await this.callbacks.saveSettingsCallback();
                            this.requestRender();
                        } else {
                            console.warn(`Unable to get group setting for ${this.groupName}`)
                        }
                    });
            });
            subMenu.addItem(subItem => {
                subItem
                    .setTitle(`${groupSetting?.logsFolderVisible ? "Hide" : "Show"} logs`)
                    .setIcon(groupSetting?.logsFolderVisible ? "eye-off" : "eye")
                    .setSection("hide")
                    .onClick(async () => {
                        if (groupSetting) {
                            groupSetting.logsFolderVisible = !groupSetting.logsFolderVisible;
                            await this.callbacks.saveSettingsCallback();
                            this.requestRender();
                        } else {
                            console.warn(`Unable to get group setting for ${this.groupName}`)
                        }
                    });
            });
            groupSetting?.excludedFolders.forEach(folderPath => {
                subMenu.addItem(subItem => {
                    subItem
                        .setTitle(`Include ${folderPath}`)
                        .setIcon("folder-plus")
                        .setSection("include")
                        .onClick(async () => {
                            if (groupSetting) {
                                groupSetting.excludedFolders.remove(folderPath);
                                await this.callbacks.saveSettingsCallback();
                                this.requestRender();
                            } else {
                                console.warn(`Unable to get group setting for ${this.groupName}`)
                            }
                        });
                });
            });
            subMenu.addItem(subItem => {
                subItem
                    .setTitle("Exclude folder")
                    .setIcon("folder-x")
                    .setSection("exclude")
                    .onClick(() => {
                        new FolderSuggestModal(
                            this.app,
                            ["/"].concat(groupSetting?.excludedFolders ?? []),
                            async (selectedPath: string) => {
                                if (!groupSetting?.excludedFolders.contains(selectedPath)) {
                                    groupSetting?.excludedFolders.push(selectedPath);
                                    await this.callbacks.saveSettingsCallback();
                                    this.requestRender();
                                }
                            }
                        ).open();
                    });
            });
        });

        menu.addItem(item =>
            item
                .setTitle(this.getHideText())
                .setIcon(this.getHideIcon())
                .setSection("danger")
                .onClick(() => {
                    this.callbacks.hideCallback()
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

    protected isFileExcluded(file: TFile, excludedFolders: string[]) {
        if (!file.parent) {
            // Unable to determine exclusion status. include it just in case
            return false;
        }

        let excluded = false;
        file.parent.path.split("/").reduce(
            (previousValue, currentValue) => {
                // early bail out if we've already determined it's excluded
                if (excluded) {
                    return "";
                }

                // build the new value, concatenating the next path part
                const newValue =
                    previousValue.length === 0 ?
                        currentValue :
                        (previousValue + "/" + currentValue);

                // check if it's excluded
                if (excludedFolders.contains(newValue)) {
                    excluded = true;
                    return "";
                }

                // not excluded, keep building
                return newValue;
            }, "");

        return excluded;
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

    private getTemplatesFolders(): string[] {
        const templatesFolders: string[] = []

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const coreTemplatesFolder = this.app.internalPlugins.plugins["templates"]?.instance?.options?.folder ?? "";
        if (coreTemplatesFolder !== "") {
            templatesFolders.push(coreTemplatesFolder);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const templaterFolder = this.app.plugins.plugins["templater-obsidian"]?.settings?.templates_folder ?? "";
        if (templaterFolder !== "") {
            templatesFolders.push(templaterFolder);
        }
        return templatesFolders;
    }

    public render(
        modifiedFiles: FileState[],
        forced: boolean,
        groupSetting: GroupSettings
    ) {
        const collapsedFolders = groupSetting.collapsedFolders ?? [];
        const excludedFolders = [...groupSetting.excludedFolders ?? []];
        if (!groupSetting.templatesFolderVisible) {
            excludedFolders.push(...this.getTemplatesFolders());
        }
        if (!groupSetting.logsFolderVisible && this.settings && this.settings.loggingPath) {
            excludedFolders.push(this.settings.loggingPath);
        }

        if (!forced && modifiedFiles.length > 0) {
            if (!modifiedFiles.some(state => {
                return this.shouldFileCauseRender(state, excludedFolders);
            })) {
                return;
            }
        }

        this.rebuildFileStructure(excludedFolders);

        if (this.isVisible()) {
            this.rootElement.removeClass("hidden");
        } else {
            this.rootElement.addClass("hidden");
        }

        super.rebuild(
            collapsedFolders,
            this.callbacks.fileClickCallback,
            this.callbacks.fileAddedCallback
        );

        this.rootElement.setAttribute("group-name", this.groupName);
        this.rootElement.setAttribute("tag-group-tag", this.groupName);
        this.rootElement.addClass(this.getContainerClass());

        this.contentContainer.removeClass("family-content");
        this.contentContainer.addClass("content");
    }
}
