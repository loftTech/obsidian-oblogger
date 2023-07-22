import { App, Menu, setIcon, TFile } from "obsidian";
import { FileClickCallback, GroupFolder, FileAddedCallback } from "./group_folder";
import { ObloggerSettings } from "./settings";

export abstract class ViewContainer extends GroupFolder {
    settings: ObloggerSettings;
    isMovable: boolean;
    canBePinned: boolean;
    isPinned: boolean;

    fileClickCallback: FileClickCallback;
    fileAddedCallback: FileAddedCallback;
    requestRenderCallback: () => void;
    saveSettingsCallback: () => void;
    hideCallback: () => void;
    moveCallback: (up: boolean) => void;
    pinCallback: (pin: boolean) => void;

    protected abstract getTitleText(): string;
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
        canBePinned: boolean,
        pinCallback: (pin: boolean) => void,
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
        return this.getGroupSetting()?.isVisible ?? true;
    }

    protected getGroupSetting() {
        return this.settings.rxGroups.find(group => group.groupName === this.groupName);
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
                        this.pinCallback(!this.isPinned)
                    })
            );
        }

        menu.addItem(item =>
            item
                .setTitle("Collapse inner folders")
                .setIcon("chevrons-down-up")
                .setSection("collapsing")
                .onClick(() => {
                    this.collapseInnerFolders();
                })
        );

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
        this.subFolders.forEach(folder => folder.setCollapsed(true, true));
    }

    private buildPinContainer(): HTMLElement {
        const pinContainerDiv = document.createElement("div");
        pinContainerDiv.addClass("pin-container");

        const pinDiv = document.createElement("div");
        pinDiv.addClass("pin");
        if (this.isPinned) {
            pinDiv.addClass("is-pinned");
        }
        // setIcon(pinDiv, "circle");
        setIcon(pinDiv, "circle");
        pinContainerDiv.appendChild(pinDiv);

        return pinContainerDiv;
    }

    private buildTitleSvgHolder() : HTMLElement {
        const svgHolder = document.createElement("div");
        svgHolder.addClass("svg-holder");

        const titleChevronContainer = document.createElement("div");
        titleChevronContainer.addClass("title-chevron-container")

        const titleChevron = document.createElement("div");
        setIcon(titleChevron, "chevron-down");
        titleChevron.addClass("title-chevron");
        if (this.isPinned) {
            titleChevron.addClass("is-pinned");
        }
        titleChevronContainer.appendChild(titleChevron)

        svgHolder.appendChild(this.buildPinContainer());
        svgHolder.appendChild(titleChevronContainer);

        return svgHolder;
    }

    private buildTitleButton() : HTMLElement {
        const titleButton = document.createElement("div");
        titleButton.addClass("title");

        const titleText = document.createElement("div");
        titleText.addClass("title-text");
        titleText.setText(this.getTitleText().toUpperCase());
        titleButton.appendChild(titleText);

        titleButton.addEventListener("contextmenu", (e) => {
            const contextMenu = this.getContextMenu();
            contextMenu && contextMenu.showAtMouseEvent(e);
        });

        return titleButton;
    }

    private buildTagTitleGroup(): HTMLElement {
        const tagTitleGroupDiv = document.createElement("div");
        tagTitleGroupDiv.addClass("tag-title-group")

        tagTitleGroupDiv.appendChild(this.buildPill());

        return tagTitleGroupDiv;
    }

    private buildPill(): HTMLElement {
        const pillDiv = document.createElement("div");
        pillDiv.addClass("title-tag");
        const pillTooltipText = this.getPillTooltipText();
        if (pillTooltipText.length > 0) {
            pillDiv.ariaLabel = pillTooltipText;
        }
        const pillClickHandler = this.getPillClickHandler();
        if (!pillClickHandler) {
            pillDiv.addClass("wiggle");
        }
        pillDiv.addEventListener("click", e => {
            e.stopPropagation();
            if (pillClickHandler) {
                pillClickHandler(e);
            }
        });

        const pillIconDiv = document.createElement("div");
        pillIconDiv.addClass("pill-icon");
        const pillIcon = this.getPillIcon();
        pillIcon && setIcon(pillIconDiv, pillIcon);
        pillDiv.appendChild(pillIconDiv);

        const pillLabelDiv = document.createElement("div");
        pillLabelDiv.addClass("pill-label");
        pillLabelDiv.setText(this.getPillText());
        pillDiv.appendChild(pillLabelDiv);

        return pillDiv;
    }

    protected buildTitle() {
        if (this.folderName !== "") {
            console.warn(`Unexpected folder name ${this.folderName}`)
        }

        this.titleContainer = document.createElement("div");
        this.titleContainer.addClass("title-container");

        this.titleContainer.appendChild(this.buildTitleButton());
        this.titleContainer.appendChild(this.buildTagTitleGroup());

        this.titleContainer.addEventListener("click", () => {
            this.toggleCollapse();
        });
    }

    rebuildFileStructure(excludedFolders: string[]) {
        // Clear
        this.files = [];
        this.subFolders = [];

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

