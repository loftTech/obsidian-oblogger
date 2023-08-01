import {
    ItemView,
    WorkspaceLeaf,
    TFile,
    ButtonComponent,
    moment,
    Menu,
    View,
    Notice
} from "obsidian";
import { ObloggerSettings, RxGroupType, TagGroup as SettingsTagGroup } from "./settings";
import { TagGroupContainer } from "./tag_group_container";
import { DailiesContainer } from "./dailies_container";
import { GroupFolder } from "./group_folder";
import { RecentsContainer } from "./recents_container";
import { UntaggedContainer } from "./untagged_container";
import { FilesContainer } from "./files_container";
import { ImageFileSuggestModal } from "./image_file_suggest_modal";
import { ViewContainer } from "./view_container";
import { buildSeparator } from "./misc_components";
import { NewTagModal } from "./new_tag_modal";

export const VIEW_TYPE_OBLOGGER = "oblogger-view";
const RENDER_DELAY_MS = 100;

declare module "obsidian" {
    interface App {
        loadLocalStorage(key: string): string | null;
        saveLocalStorage(key: string, value: string | undefined): void;
    }
}

// Needed for using built-in context menu
class FileItem {
    titleEl: HTMLElement;
    el: HTMLElement;
    titleInnerEl: HTMLElement;
    file: TFile;
    selfEl: HTMLElement;

    constructor(
        file: TFile,
        el: HTMLElement,
        titleEl: HTMLElement,
        titleInnerEl: HTMLElement
    ) {
        this.el = el;
        this.file = file;
        this.titleEl = titleEl;
        this.titleInnerEl = titleInnerEl;

        // not sure if this is the right thing to set it to
        this.selfEl = el;
    }
}

// Needed for using built-in context menu
class UnknownInfinityScrollObject {
    computeSync: () => void;
    scrollIntoView: () => void;
}

// Needed for using built-in context menu
class UnknownDomObject {
    infinityScroll: UnknownInfinityScrollObject;
}

interface TagGroup {
    tag: string,
    container: TagGroupContainer
}
export class ObloggerView extends ItemView {
    settings: ObloggerSettings;
    avatarDiv: HTMLElement;
    greeterContainerDiv: HTMLElement;
    otcGroups: TagGroup[]
    rxContainers: ViewContainer[]
    lastOpenFile: TFile | undefined;
    renderTimeout: number | null = null;
    otcGroupsDiv: HTMLElement | undefined;
    rxGroupsDiv: HTMLElement | undefined;
    showLoggerCallbackFn: () => Promise<void>;
    saveSettingsCallback: () => Promise<void>;
    fileClickCallback: (file: TFile) => void;
    fileAddedCallback: (
        file: TFile,
        contentItem: HTMLElement,
        titleItem: HTMLDivElement,
        titleContentItem: HTMLElement) => void;
    rxGroupCollapseChangeCallback: (
        groupName: string,
        collapsedFolders: string[],
        save: boolean
    ) => void;
    tagGroupCollapseChangedCallback: (
        groupName: string,
        collapsedFolders: string[],
        save: boolean
    ) => void;

    // These are needed for the context menu to work
    files: WeakMap<HTMLElement, TFile>;
    fileItems: {[id: string]: FileItem};
    selectedDoms: [];
    dom: UnknownDomObject;
    openFileContextMenu: (e: MouseEvent, container: HTMLDivElement) => void;
    setFocusedItem: (fileItem: FileItem) => void;
    afterCreate: (file: TFile, unknownBool: boolean) => void;
    isItem: (file: TFile) => boolean;

    constructor(
        leaf: WorkspaceLeaf,
        showLoggerCallbackFn: () => Promise<void>,
        settings: ObloggerSettings,
        saveSettingsCallback: () => Promise<void>
    ) {
        super(leaf);

        this.settings = settings;
        this.showLoggerCallbackFn = showLoggerCallbackFn;
        this.files = new WeakMap();
        this.selectedDoms = [];
        this.fileItems = {};
        this.otcGroups = [];
        this.saveSettingsCallback = saveSettingsCallback;

        class FileExplorerLeaf extends WorkspaceLeaf {}
        interface FileExplorerView extends View {
            openFileContextMenu: (e: MouseEvent, container: HTMLDivElement) => void;
            setFocusedItem: (fileItem: FileItem) => void;
            afterCreate: (file: TFile, unknownBool: boolean) => void;
        }

        this.lastOpenFile = this.app.workspace.getActiveFile() ?? undefined;

        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                if (file) {
                    this.lastOpenFile = file;
                    this.highlightLastOpenFile();
                }
            })
        );

        this.fileClickCallback = (file: TFile) => {
            const { workspace } = this.app;
            workspace.getLeaf(false).openFile(file);
        }
        this.fileAddedCallback = (
            file: TFile,
            contentItem: HTMLElement,
            titleItem: HTMLDivElement,
            titleContentItem: HTMLElement
        ) => {
            this.files.set(contentItem, file);
            this.fileItems[file.path] = new FileItem(file, contentItem, titleItem, titleContentItem);
            contentItem.addEventListener("contextmenu", (e) => {
                this.openFileContextMenu(e, titleItem);
            });
        }

        this.rxGroupCollapseChangeCallback = (
            groupName: string,
            collapsedFolders: string[],
            save: boolean
        ) => {
            if (!save) {
                return;
            }
            const groupSetting = this.settings?.rxGroups.find(group => group.groupName === groupName);
            if (groupSetting) {
                groupSetting.collapsedFolders = collapsedFolders;
                this.saveSettingsCallback();
            }
        }

        this.tagGroupCollapseChangedCallback = (
            groupName: string,
            collapsedFolders: string[],
            save: boolean
        ) => {
            if (!save) {
                return;
            }
            const group = this.settings?.tagGroups.find(
                group => group.tag === groupName
            );
            if (!group) {
                new Notice(`Unable to find tag ${groupName} to update the collapse for.`);
                return;
            }
            group.collapsedFolders = collapsedFolders;
            this.saveSettingsCallback();
        }

        this.dom = {
            infinityScroll: {
                computeSync: () => { console.debug("computeSync does nothing"); },
                scrollIntoView: () => { console.debug("scrollIntoView does nothing"); }
            }
        }

        this.app.workspace.onLayoutReady(() => {
            // Hook up to the file-explorer plugin
            const fileExplorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0] as FileExplorerLeaf;
            const fileExplorer = fileExplorerLeaf.view as FileExplorerView;
            this.openFileContextMenu = fileExplorer.openFileContextMenu;
            this.setFocusedItem = fileExplorer.setFocusedItem;
            this.afterCreate = fileExplorer.afterCreate;
            this.isItem = () => false;

            this.registerEvent(
                // todo(#172): right now, we're disabling rename because it's broken
                //  however, we should fix it with either custom rename or by getting
                //  the in-line rename to work right
                this.app.workspace.on("file-menu", (menu) => {
                    // Don't hide it for other views (like file-explorer)
                    if(!this.app.workspace.getActiveViewOfType(ObloggerView)?.getState()) {
                        return;
                    }
                    // These types are added at run-time on top of Menu? Or Menu is
                    // the wrong type to be using and these are already defined
                    // somewhere.
                    class FileMenuAction {
                        titleEl: HTMLElement;
                    }
                    class FileMenu extends Menu {
                        items: FileMenuAction[]
                    }
                    const fileMenu = menu as FileMenu;
                    const renameAction = fileMenu.items.find(i => i?.titleEl?.innerHTML === "Rename");
                    renameAction && fileMenu.items.remove(renameAction);
                })
            );

            // Hook up to the bookmarks plugin
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const bookmarkPlugin = this.app.internalPlugins.getEnabledPluginById("bookmarks");
            if (bookmarkPlugin) {
                bookmarkPlugin.on("changed", () => {
                    this.requestRender();
                });
            }
        });
    }

    private highlightLastOpenFile() {
        this.rxContainers
            .concat(this.otcGroups.map(tg => tg.container))
            .forEach(container => {
                this.lastOpenFile && container.highlightFile(this.lastOpenFile);
            });
    }

    getViewType() {
        return VIEW_TYPE_OBLOGGER;
    }

    getDisplayText() {
        return "Oblogger";
    }

    getIcon(): string {
        return "tags";
    }

    requestRender() {
        if (this.renderTimeout) {
            return;
        }
        this.renderTimeout = window.setTimeout(
            () => this.renderNow(),
            RENDER_DELAY_MS
        );
        this.registerInterval(this.renderTimeout);
    }

    private renderTagGroup(group: GroupFolder) {
        const excludedFolders = this.settings?.excludedFolders ?? [];
        const collapsedFolders = this.settings?.tagGroups.find(
            settingsGroup => settingsGroup.tag === group.groupName
        )?.collapsedFolders ?? [];
        if (group instanceof TagGroupContainer) {
            group.render(collapsedFolders, excludedFolders);
        }
    }

    private renderRxGroup(groupName: string, excludedFolders: string[]) {
        const groupSetting = this.settings?.rxGroups.find(group => group.groupName === groupName);
        if (!groupSetting) {
            console.warn(`unable to find settings for rx group ${groupName}`);
            return;
        }
        const container = this.rxContainers.find(container => container.groupName === groupName);
        if (!container) {
            console.warn(`unable to find container for rx group ${groupName}`);
            return;
        }
        container.render(groupSetting.collapsedFolders ?? [], excludedFolders);
    }

    private renderDailies() {
        this.renderRxGroup(RxGroupType.DAILIES, this.settings?.excludedFolders ?? []);
    }

    private renderFiles() {
        this.renderRxGroup(RxGroupType.FILES, []);
    }

    private renderUntagged() {
        this.renderRxGroup(RxGroupType.UNTAGGED, [this.settings?.loggingPath]);
    }

    private renderRecents() {
        this.renderRxGroup(RxGroupType.RECENTS, []);
    }

    private async renderNow() {
        this.files = new WeakMap();
        this.fileItems = {};

        await this.renderAvatar();

        this.renderRecents();
        this.renderDailies();
        this.renderUntagged();
        this.renderFiles();

        this.otcGroups.forEach(group => this.renderTagGroup(group.container));

        this.highlightLastOpenFile();

        this.renderTimeout = null;
    }

    private async renderAvatar() {
        if (this.settings?.avatarVisible) {
            this.greeterContainerDiv && this.greeterContainerDiv.removeClass("hidden");
        } else {
            this.greeterContainerDiv && this.greeterContainerDiv.addClass("hidden");
        }
        const myImage = new Image();
        if (this.settings?.avatarPath) {
            const maybeAvatarFile = this.app.vault.getAbstractFileByPath(this.settings.avatarPath);
            if (maybeAvatarFile instanceof TFile) {
                myImage.src = this.app.vault.getResourcePath(maybeAvatarFile);
            }
        }

        if (myImage.src === "") {
            myImage.addClass("hidden");
        }
        myImage.addClass("greeter-title-avatar");

        this.avatarDiv.empty();
        this.avatarDiv.appendChild(myImage);
    }

    private renderClock(clockDiv: HTMLElement) {
        clockDiv.empty();
        const timestamp = moment();
        const dayDiv = document.createElement("div");
        dayDiv.setText(timestamp.format("YYYY-MM-DD"));
        dayDiv.addClass("date");
        clockDiv.appendChild(dayDiv);
        const timeDiv = document.createElement("div");
        timeDiv.setText(timestamp.format("HH:mm:ss"));
        timeDiv.addClass("time");
        clockDiv.appendChild(timeDiv);
    }

    private async buildGreeter() {
        const greeter = document.createElement("div");
        greeter.classList.add("greeter");

        const greeterTitle = document.createElement("div");
        greeterTitle.classList.add("greeter-title");

        this.greeterContainerDiv = document.createElement("div");
        this.greeterContainerDiv.addClass("greeter-dot-container");
        greeterTitle.appendChild(this.greeterContainerDiv);

        const avatarBorderDiv = document.createElement("div");
        avatarBorderDiv.addClass("greeter-title-avatar-border");
        this.greeterContainerDiv.appendChild(avatarBorderDiv);

        this.avatarDiv = document.createElement("div");
        await this.renderAvatar();
        this.greeterContainerDiv.appendChild(this.avatarDiv);

        const defaultAvatarDiv = document.createElement("div");
        defaultAvatarDiv.addClass("greeter-title-default-avatar");
        defaultAvatarDiv.setText(this.app.vault.getName().charAt(0).toUpperCase());
        this.greeterContainerDiv.appendChild(defaultAvatarDiv);

        const avatarChangerDiv = document.createElement("div");
        avatarChangerDiv.addClass("greeter-title-avatar-changer");
        avatarChangerDiv.addEventListener("click", () => {
            const modal = new ImageFileSuggestModal(this.app, async (image: TFile) => {
                this.settings.avatarPath = image.path;
                await this.saveSettingsCallback();
                new Notice(`Changed avatar image to ${image.path}`);
                this.requestRender();
            })
            modal.open();
        });

        const avatarChangerLabelDiv = document.createElement("div");
        avatarChangerLabelDiv.addClass("greeter-title-avatar-changer-label");
        avatarChangerLabelDiv.setText("Change");
        avatarChangerDiv.appendChild(avatarChangerLabelDiv);

        this.greeterContainerDiv.appendChild(avatarChangerDiv);

        greeter.appendChild(greeterTitle);

        const vaultNameDiv = document.createElement("div");
        vaultNameDiv.addClass("greeter-vault-name");
        greeterTitle.appendChild(vaultNameDiv);
        vaultNameDiv.setText(this.app.vault.getName());

        const clockDiv = document.createElement("div");
        clockDiv.addClass("greeter-clock");
        greeterTitle.appendChild(clockDiv);
        this.renderClock(clockDiv);
        this.registerInterval(window.setInterval(
            () => {
                this.renderClock(clockDiv);
            },
            1000))

        const greeterContent = document.createElement("div");
        greeterContent.classList.add("greeter-content");
        greeter.appendChild(greeterContent);

        return greeter;
    }

    private showNewTagModal() {
        const modal = new NewTagModal(this.app, async (result: string)=> {
            if (!this.settings.tagGroups) {
                this.settings.tagGroups = [];
            }
            this.settings.tagGroups.push({
                tag: result,
                collapsedFolders: [],
                isPinned: false
            });
            await this.saveSettingsCallback();
            this.reloadOtcGroups();
        });
        modal.open();
    }

    private buildHeaderInto(header: HTMLElement): void {
        const buttonBar = document.createElement("div");
        buttonBar.addClass("nav-buttons-container");
        header.appendChild(buttonBar);

        new ButtonComponent(buttonBar)
            .setClass("button-bar-button")
            .setIcon("edit")
            .setTooltip("New note")
            .onClick(async () => {
                const parent = this.app.fileManager.getNewFileParent(
                    this.app.workspace.getActiveFile()?.path ?? "")
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const ret = await this.app.fileManager.createNewMarkdownFile(parent);
                new Notice(`Created ${ret.path}`);
                await this.app.workspace.getLeaf(false).openFile(ret);
            })

        new ButtonComponent(buttonBar)
            .setClass("button-bar-button")
            .setIcon("folder-plus")
            .setTooltip("Add a new user tag group")
            .onClick(() => this.showNewTagModal());

        new ButtonComponent(buttonBar)
            .setClass("button-bar-button")
            .setIcon("form-input")
            .setTooltip("Create a log entry")
            .onClick(this.showLoggerCallbackFn);

        new ButtonComponent(buttonBar)
            .setClass("button-bar-button")
            .setIcon("gear")
            .setTooltip("Settings")
            .onClick((e) => {
                const menu = new Menu();

                if (this.settings) {
                    menu.addItem(item => {
                        item.setTitle(`${this.settings.avatarVisible ? "Hide" : "Show"} avatar`);
                        item.setIcon(this.settings.avatarVisible ? "eye-off" : "eye");
                        item.onClick(async () => {
                            this.settings.avatarVisible = !this.settings.avatarVisible;
                            await this.saveSettingsCallback();
                            this.requestRender();
                        })
                    });

                    menu.addSeparator();

                    this.settings.rxGroups.forEach(groupSetting => {
                        menu.addItem(item => {
                            const isVisible = groupSetting.isVisible;
                            item.setTitle(`${isVisible ? "Hide" : "Show"} ${groupSetting.groupName}`);
                            item.setIcon(isVisible ? "eye-off" : "eye");
                            item.onClick(async () => {
                                groupSetting.isVisible = !groupSetting.isVisible;
                                await this.saveSettingsCallback();
                                this.requestRender();
                            });
                        });
                    });
                    menu.showAtMouseEvent(e);
                }
            });
    }

    private async removeOtcGroup(tag: string) {
        const tagGroup = this.otcGroups.find((tg) => tg.tag === tag);
        if (tagGroup === undefined) {
            new Notice("Nothing to delete");
            return;
        }
        if (tagGroup.tag !== tag) {
            console.debug("Something went wrong, tag group has wrong tag.");
            return;
        }
        this.otcGroups.remove(tagGroup);
        tagGroup.container.rootElement.remove();
        this.settings.tagGroups = this.settings?.tagGroups.filter(group => group.tag !== tag);
        await this.saveSettingsCallback();
        this.requestRender();
        new Notice(`"${tag}" removed`);
    }

    private moveRxGroup(groupName: string, up: boolean): void {
        if (!this.settings) {
            return;
        }

        const currentIndex = this.settings.rxGroups.findIndex(group => group.groupName === groupName);
        if (currentIndex === -1) {
            console.warn(`Group ${groupName} doesn't exist.`);
            return;
        }

        // find the new index
        let newIndex = currentIndex + (up ? -1 : 1);
        // skip over hidden groups
        while (
            newIndex > 0 &&
            newIndex < this.settings.rxGroups.length &&
            !this.settings.rxGroups[newIndex].isVisible
        ) {
            newIndex = newIndex + (up ? -1 : 1);
        }
        // if we're beyond the min/max, then we're already at the top/bottom
        if (newIndex < 0 || newIndex >= this.settings.rxGroups.length) {
            console.log(`Already at ${up ? "top" : "bottom"}`);
            return;
        }

        // todo(#215): try to get this to one operation using splice to swap in place
        const group = this.settings.rxGroups[currentIndex];
        this.settings.rxGroups.remove(group);
        this.settings.rxGroups.splice(newIndex, 0, group);

        this.saveSettingsCallback();
        this.reloadRxGroups();
        this.requestRender();
    }

    private async moveOtcGroup(tag: string, up: boolean): Promise<void> {
        const currentIndex = this.settings.tagGroups.findIndex(group => group.tag === tag);
        if (currentIndex === -1) {
            console.warn(`Tag ${tag} doesn't exist.`);
            return;
        }

        const newIndex = currentIndex + (up ? -1 : 1);

        if (newIndex < 0 || newIndex >= this.settings.tagGroups.length) {
            console.log(`Already at ${up ? "top" : "bottom"}`);
            return;
        }

        // todo(#215): try to get this to one operation using splice to swap in place
        const group = this.settings.tagGroups[currentIndex];
        this.settings.tagGroups.remove(group);
        this.settings.tagGroups.splice(newIndex, 0, group);

        await this.saveSettingsCallback();
        this.reloadOtcGroups();
        this.requestRender();
    }

    private async pinOtcGroup(tag: string, pin: boolean): Promise<void> {
        const otcGroup = this.settings.tagGroups.find((tagGroup) => tagGroup.tag === tag);
        if (otcGroup === undefined) {
            new Notice(`Unable to find tag ${tag} to ${pin ? "pin" : "unpin"}`);
            return;
        }
        otcGroup.isPinned = pin;
        await this.saveSettingsCallback();
        this.reloadOtcGroups();
        this.requestRender();
    }

    private addOtcGroup(
        tag: string,
        isPinned: boolean,
        parent: HTMLElement
    ) {
        const removeCallback = async () => { return await this.removeOtcGroup(tag); }
        const moveCallback = (up: boolean) => { this.moveOtcGroup(tag, up); }
        const pinCallback = (pin: boolean) => { this.pinOtcGroup(tag, pin); }

        const container = new TagGroupContainer(
            this.app,
            tag,
            removeCallback,
            moveCallback,
            this.fileClickCallback,
            this.fileAddedCallback,
            this.tagGroupCollapseChangedCallback,
            () => { this.requestRender() },
            this.settings,
            this.saveSettingsCallback,
            pinCallback,
            isPinned);
        this.otcGroups.push({
            tag: tag,
            container: container
        })
        parent.appendChild(container.rootElement);
        this.requestRender();
    }

    private reloadOtcGroups() {
        console.log("reloading otc groups")
        this.otcGroupsDiv?.empty();

        this.otcGroups = [];
        this.files = new WeakMap();
        this.fileItems = {};

        const groupSorter = (a: SettingsTagGroup, b: SettingsTagGroup): number => {
            const pattern = "\\.\\.\\./(.*)/\\.\\.\\.";
            const aTag = a.tag.match(pattern)?.at(1) ?? a.tag;
            const bTag = b.tag.match(pattern)?.at(1) ?? b.tag;
            const aChildTag = aTag.split("/").last() ?? "";
            const bChildTag = bTag.split("/").last() ?? "";
            return aChildTag < bChildTag ? -1 : aChildTag > bChildTag ? 1 : 0
        }

        // Add pinned groups
        this.settings?.tagGroups
            ?.filter(otcGroup => otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addOtcGroup(
                    group.tag,
                    true,
                    this.otcGroupsDiv);
            });

        // Add unpinned groups
        this.settings.tagGroups
            ?.filter(otcGroup => !otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addOtcGroup(
                    group.tag,
                    false,
                    this.otcGroupsDiv);
            });
    }

    private async hideRxGroup(groupName: string) {
        const groupSetting = this.settings.rxGroups.find(group => group.groupName === groupName);
        if (!groupSetting) {
            console.warn(`Unable to find settings for group ${groupName}`)
            return;
        }
        groupSetting.isVisible = !groupSetting.isVisible;
        await this.saveSettingsCallback();
        this.requestRender();
    }

    private reloadRxGroups() {
        if (!this.rxGroupsDiv) {
            return;
        }

        this.rxContainers = [];

        const getRxType = (groupName: string) => {
            switch(groupName) {
                case RxGroupType.RECENTS:
                    return RecentsContainer;
                case RxGroupType.DAILIES:
                    return DailiesContainer;
                case RxGroupType.UNTAGGED:
                    return UntaggedContainer;
                case RxGroupType.FILES:
                default: // this is here so the compiler doesn't see undefined
                    return FilesContainer;
            }
        }

        const createRxGroup = (groupName: string) => {
            const ctor = getRxType(groupName);
            return new ctor(
                this.app,
                this.fileClickCallback,
                this.fileAddedCallback,
                this.rxGroupCollapseChangeCallback,
                () => { this.requestRender() },
                this.settings,
                this.saveSettingsCallback,
                (up: boolean) => { this.moveRxGroup(groupName, up); },
                () => { this.hideRxGroup(groupName); });
        }

        this.rxContainers = this.settings?.rxGroups.map(rxGroupSetting => {
            return createRxGroup(rxGroupSetting.groupName)
        }) ?? []

        this.rxGroupsDiv.empty();
        this.rxContainers.forEach(container =>
            this.rxGroupsDiv?.appendChild(container.rootElement)
        );
    }

    private async buildBodyInto(body: HTMLElement) {
        const greeter = await this.buildGreeter();

        body.appendChild(greeter);

        body.appendChild(buildSeparator(
            "rx-separator",
            "oblogger-groups",
            "Prescribed tag groups"
        ));

        this.rxGroupsDiv = document.createElement("div");
        this.rxGroupsDiv.addClass("rx-groups");

        this.reloadRxGroups();

        body.appendChild(this.rxGroupsDiv);

        body.appendChild(buildSeparator(
            "otc-separator",
            "user-groups",
            "Over-the-counter tag groups"
        ));

        this.otcGroupsDiv = document.createElement("div");
        this.otcGroupsDiv.addClass("otc-groups");

        this.reloadOtcGroups();

        body.appendChild(this.otcGroupsDiv);
    }

    async onOpen() {
        this.containerEl.empty();

        const header = document.createElement("div");
        header.addClass("oblogger-header");
        this.buildHeaderInto(header);
        this.containerEl.appendChild(header);

        const body = document.createElement("div");
        body.addClass("oblogger-content");
        await this.buildBodyInto(body);
        this.containerEl.appendChild(body);

        this.requestRender();

    }
}
