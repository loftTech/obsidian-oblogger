import { App, Menu, setIcon, TFile } from "obsidian";
import { FileClickCallback, GroupFolder, FileAddedCallback } from "./group_folder";
import { ObloggerSettings, RxGroupSettings } from "./settings";

export abstract class ViewContainer extends GroupFolder {
    settings: ObloggerSettings;
    isMovable: boolean;
    canCollapseInnerFolders: boolean;
    canBePinned: boolean;
    isPinned: boolean;

    fileClickCallback: FileClickCallback;
    fileAddedCallback: FileAddedCallback;
    requestRenderCallback: () => void;
    saveSettingsCallback: () => void;
    hideCallback: () => void;
    moveCallback: (up: boolean) => void;
    pinCallback: ((pin: boolean) => void) | undefined;

    protected abstract getTitleText(): string;
    protected abstract getTitleTooltip(): string;
    protected abstract getTitleIcon(): string;
    protected abstract getTitleIconTooltip(): string;
    protected abstract getPillText(): string;
    protected abstract getPillTooltipText(): string;
    protected abstract getPillIcon(): string;
    protected abstract buildFileStructure(excludedFolders: string[]): void;
    protected abstract getContainerClass(): string;
    protected abstract getPillClickHandler(): ((e: MouseEvent) => void) | undefined;
    protected abstract getHideText(): string;
    protected abstract getHideIcon(): string;
    protected abstract getEmptyMessage(): string;

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

        titleChevron.appendChild(this.buildPinContainer());

        return titleChevron;
    }

    private buildTitleTextDiv(): HTMLElement {
        const titleText = document.createElement("div");
        titleText.addClass("title-text");

        const titleIcon = document.createElement("div");
        setIcon(titleIcon, this.getTitleIcon());
        titleIcon.addClass("title-icon");
        titleIcon.ariaLabel = this.getTitleIconTooltip();

        const titleTextContainer = document.createElement("div");
        titleTextContainer.addClass("title-text-container");
        titleTextContainer.appendChild(titleText);
        titleTextContainer.appendChild(titleIcon);

        titleTextContainer.addEventListener("click", () => {
            this.toggleCollapse();
        });

        titleText.setText(this.getTitleText().toUpperCase());
        titleText.addEventListener("contextmenu", (e) => {
            const contextMenu = this.getContextMenu();
            contextMenu && contextMenu.showAtMouseEvent(e);
        });
        titleText.ariaLabel = this.getTitleTooltip();

        return titleTextContainer;
    }

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

        const pillIconDiv = document.createElement("div");
        pillIconDiv.addClass("pill-icon");
        const pillIcon = this.getPillIcon();
        pillIcon && setIcon(pillIconDiv, pillIcon);
        titleTagDiv.appendChild(pillIconDiv);

        const pillLabelDiv = document.createElement("div");
        pillLabelDiv.addClass("pill-label");
        pillLabelDiv.setText(this.getPillText());
        titleTagDiv.appendChild(pillLabelDiv);

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

    public render(collapsedFolders: string[], excludedFolders: string[]) {
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

