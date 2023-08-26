import {
    ItemView,
    WorkspaceLeaf,
    TFile,
    ButtonComponent,
    moment,
    Menu,
    Notice,
    CachedMetadata
} from "obsidian";
import { ObloggerSettings, RxGroupType, OtcGroupSettings as SettingsTagGroup } from "./settings";
import { TagGroupContainer } from "./tag_group_container";
import { DailiesContainer } from "./dailies_container";
import { FileClickCallback, GroupFolder } from "./group_folder";
import { RecentsContainer } from "./recents_container";
import { UntaggedContainer } from "./untagged_container";
import { FilesContainer } from "./files_container";
import { ImageFileSuggestModal } from "./image_file_suggest_modal";
import { ViewContainer } from "./view_container";
import { buildSeparator } from "./misc_components";
import { NewTagModal } from "./new_tag_modal";
import { buildStateFromFile, FileState } from "./constants";

export const VIEW_TYPE_OBLOGGER = "oblogger-view";
const RENDER_DELAY_MS = 100;

declare module "obsidian" {
    interface App {
        loadLocalStorage(key: string): string | null;
        saveLocalStorage(key: string, value: string | undefined): void;
    }
}

interface TagGroup {
    tag: string;
    container: TagGroupContainer;
}

export class ObloggerView extends ItemView {
    settings: ObloggerSettings;
    avatarDiv: HTMLElement;
    greeterDiv: HTMLElement;
    greeterContainerDiv: HTMLElement;
    vaultNameDiv: HTMLElement;
    clockDiv: HTMLElement;
    rxSeparatorDiv: HTMLElement;
    otcSeparatorDiv: HTMLElement;
    otcGroups: TagGroup[]
    rxContainers: ViewContainer[]
    lastOpenFile: TFile | undefined;
    renderTimeout: number | null = null;
    filesModifiedSinceRender: FileState[];
    fullRender: boolean;
    otcGroupsDiv: HTMLElement | undefined;
    rxGroupsDiv: HTMLElement | undefined;
    showLoggerCallbackFn: () => Promise<void>;
    saveSettingsCallback: () => Promise<void>;
    fileClickCallback: FileClickCallback;
    fileAddedCallback: (
        file: TFile,
        contentItem: HTMLElement) => void;
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

    constructor(
        leaf: WorkspaceLeaf,
        showLoggerCallbackFn: () => Promise<void>,
        settings: ObloggerSettings,
        saveSettingsCallback: () => Promise<void>
    ) {
        super(leaf);

        this.fullRender = true;
        this.settings = settings;
        this.showLoggerCallbackFn = showLoggerCallbackFn;
        this.otcGroups = [];
        this.saveSettingsCallback = saveSettingsCallback;

        this.lastOpenFile = this.app.workspace.getActiveFile() ?? undefined;


        this.registerEvent(
            this.app.metadataCache.on("changed", (
                fileChanged: TFile,
                fileContents: string,
                fileMetadata: CachedMetadata
            ) => {
                this.requestRender(buildStateFromFile(this.app, fileChanged, fileMetadata));
            })
        );

        this.registerEvent(
            this.app.vault.on("create", () => {
                this.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("rename", () => {
                this.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("delete", () => {
                this.requestRender();
            })
        );

        this.registerEvent(
            this.app.workspace.on("file-open", (
                fileOpened: TFile | null
            ) => {
                if (fileOpened) {
                    this.lastOpenFile = fileOpened;
                    this.highlightLastOpenFile();
                }
            })
        );

        this.fileClickCallback = (file: TFile, isCtrlCmdKeyDown: boolean) => {
            return this.app.workspace.getLeaf(isCtrlCmdKeyDown).openFile(file);
        }

        this.fileAddedCallback = (
            file: TFile,
            contentItem: HTMLElement
        ) => {
            contentItem.addEventListener("contextmenu", (e) => {
                const menu = new Menu();

                menu.addSeparator();

                menu.addItem((item) =>
                    item
                        .setTitle(`Open in new tab`)
                        .setSection("open")
                        .setIcon("lucide-file-plus")
                        .onClick(async () => {
                            return app.workspace.openLinkText(file.path, file.path, "tab");
                        })
                );

                menu.addItem((item) =>
                    item
                        .setTitle(`Open to the right`)
                        .setSection("open")
                        .setIcon("lucide-separator-vertical")
                        .onClick(async () => {
                            return app.workspace.openLinkText(file.path, file.path, "split");
                        })
                );

                // This adds all the normal file-explorer stuff
                this.app.workspace.trigger(
                    "file-menu",
                    menu,
                    file,
                    "file-explorer");

                if ("screenX" in e) {
                    menu.showAtPosition({ x: e.pageX, y: e.pageY });
                } else {
                    menu.showAtPosition({
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        x: e.nativeEvent.locationX,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        y: e.nativeEvent.locationY,
                    });
                }
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
                return this.saveSettingsCallback();
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
            return this.saveSettingsCallback();
        }

        this.app.workspace.onLayoutReady(() => {
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

    requestRender(maybeFileDetails?: FileState) {
        if (!maybeFileDetails) {
            this.fullRender = true;
        } else {
            const index = this.filesModifiedSinceRender.findIndex(
                details => details.file === maybeFileDetails.file);
            if (index >= 0) {
                this.filesModifiedSinceRender[index] = maybeFileDetails;
            } else {
                this.filesModifiedSinceRender.push(maybeFileDetails);
            }
        }

        if (this.renderTimeout) {
            return;
        }
        this.renderTimeout = window.setTimeout(
            () => {
                const modified = this.fullRender ? [] : this.filesModifiedSinceRender;
                this.filesModifiedSinceRender = [];
                this.fullRender = false;
                return this.renderNow(modified);
            },
            RENDER_DELAY_MS
        );
        this.registerInterval(this.renderTimeout);
    }

    private renderTagGroup(group: GroupFolder, modifiedFiles: FileState[]) {
        const maybeSettingsGroup = this.settings?.tagGroups.find(
            settingsGroup => settingsGroup.tag === group.groupName
        );

        if (!maybeSettingsGroup) {
            console.warn(`unable to find settings for tag group ${group.groupName}`);
            return;
        }

        if (group instanceof TagGroupContainer) {
            group.render(modifiedFiles, false, maybeSettingsGroup);
        }
    }

    private renderRxGroup(
        groupName: string,
        modifiedFiles: FileState[],
        forced: boolean
    ) {
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
        container.render(
            modifiedFiles,
            forced,
            groupSetting);
    }

    private renderDailies(modifiedFiles: FileState[]) {
        this.renderRxGroup(
            RxGroupType.DAILIES,
            modifiedFiles,
            false);
    }

    private renderFiles(modifiedFiles: FileState[]) {
        this.renderRxGroup(
            RxGroupType.FILES,
            modifiedFiles,
            false);
    }

    private renderUntagged(modifiedFiles: FileState[]) {
        this.renderRxGroup(
            RxGroupType.UNTAGGED,
            modifiedFiles,
            false);
    }

    private renderRecents(modifiedFiles: FileState[]) {
        this.renderRxGroup(
            RxGroupType.RECENTS,
            modifiedFiles,
            false);
    }

    private async renderNow(modifiedFiles: FileState[]) {
        await this.renderAvatar();
        await this.renderVault();
        this.renderClock(this.clockDiv);
        this.renderRXSeparator();
        this.renderOTCSeparator();

        this.renderRecents(modifiedFiles);
        this.renderDailies(modifiedFiles);
        this.renderUntagged(modifiedFiles);
        this.renderFiles(modifiedFiles);

        this.otcGroups.forEach(group => this.renderTagGroup(group.container, modifiedFiles));

        this.highlightLastOpenFile();

        this.renderTimeout = null;
    }

    private async renderAvatar() {
        if (this.settings?.avatarVisible) {
            this.greeterContainerDiv?.removeClass("hidden");
            this.greeterDiv?.removeClass("no-avatar");
        } else {
            this.greeterContainerDiv?.addClass("hidden");
            this.greeterDiv?.addClass("no-avatar");
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

    private async renderVault() {
        if (this.settings?.vaultVisible) {
            this.vaultNameDiv?.removeClass("hidden");
        } else {
            this.vaultNameDiv?.addClass("hidden");
        }
        this.vaultNameDiv.setText(this.app.vault.getName());
        this.vaultNameDiv.addClass("greeter-vault-name");
}

    private renderClock(clockDiv: HTMLElement) {
        if (this.settings?.clockVisible) {
            this.clockDiv?.removeClass("hidden");
        } else {
            this.clockDiv?.addClass("hidden");
        }
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
    
    private renderRXSeparator() {
        if (this.settings?.rxSeparatorVisible) {
            this.rxSeparatorDiv?.removeClass("hidden");
        } else {
            this.rxSeparatorDiv?.addClass("hidden");
        }
    }

    private renderOTCSeparator() {
        if (this.settings?.otcSeparatorVisible) {
            this.otcSeparatorDiv?.removeClass("hidden");
        } else {
            this.otcSeparatorDiv?.addClass("hidden");
        }
    }

    private async buildGreeter() {
        this.greeterDiv = document.createElement("div");
        this.greeterDiv.classList.add("greeter");

        const greeterTitleDiv = document.createElement("div");
        greeterTitleDiv.classList.add("greeter-title");

        this.greeterContainerDiv = document.createElement("div");
        this.greeterContainerDiv.addClass("greeter-dot-container");
        greeterTitleDiv.appendChild(this.greeterContainerDiv);

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

        this.greeterDiv.appendChild(greeterTitleDiv);

        const greeterContentDiv = document.createElement("div");
        greeterContentDiv.classList.add("greeter-content");
        this.greeterDiv.appendChild(greeterContentDiv);

        this.vaultNameDiv = document.createElement("div");
        await this.renderVault();
        greeterContentDiv.appendChild(this.vaultNameDiv);

        this.clockDiv = document.createElement("div");
        this.clockDiv.addClass("greeter-clock");
        greeterContentDiv.appendChild(this.clockDiv);
        this.renderClock(this.clockDiv);
        this.registerInterval(window.setInterval(
            () => {
                this.renderClock(this.clockDiv);
            },
            1000))

        return this.greeterDiv;
    }

    private showNewTagModal() {
        const modal = new NewTagModal(this.app, async (result: string)=> {
            if (!this.settings.tagGroups) {
                this.settings.tagGroups = [];
            }
            this.settings.tagGroups.push({
                tag: result,
                collapsedFolders: [],
                isPinned: false,
                excludedFolders: [],
                logsFolderVisible: false,
                templatesFolderVisible: false
            });
            await this.saveSettingsCallback();
            this.reloadOtcGroups();
        });
        modal.open();
    }

    private buildHeaderInto(header: HTMLElement): void {
        const buttonBarDiv = document.createElement("div");
        buttonBarDiv.addClass("nav-buttons-container");
        header.appendChild(buttonBarDiv);

        new ButtonComponent(buttonBarDiv)
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

        new ButtonComponent(buttonBarDiv)
            .setClass("button-bar-button")
            .setIcon("folder-plus")
            .setTooltip("Add a new user tag group")
            .onClick(() => this.showNewTagModal());

        new ButtonComponent(buttonBarDiv)
            .setClass("button-bar-button")
            .setIcon("form-input")
            .setTooltip("Create a log entry")
            .onClick(this.showLoggerCallbackFn);

        new ButtonComponent(buttonBarDiv)
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
                        menu.addItem(item => {
                            item.setTitle(`${this.settings.vaultVisible ? "Hide" : "Show"} vault name`);
                            item.setIcon(this.settings.vaultVisible ? "eye-off" : "eye");
                            item.onClick(async () => {
                                this.settings.vaultVisible = !this.settings.vaultVisible;
                                await this.saveSettingsCallback();
                                this.requestRender();
                            })
                        });
                        menu.addItem(item => {
                            item.setTitle(`${this.settings.clockVisible ? "Hide" : "Show"} clock`);
                            item.setIcon(this.settings.clockVisible ? "eye-off" : "eye");
                            item.onClick(async () => {
                                this.settings.clockVisible = !this.settings.clockVisible;
                                await this.saveSettingsCallback();
                                this.requestRender();
                            })
                        });
                        menu.addItem(item => {
                            item.setTitle(`${this.settings.rxSeparatorVisible ? "Hide" : "Show"} oblogger group separator`);
                            item.setIcon(this.settings.rxSeparatorVisible ? "eye-off" : "eye");
                            item.onClick(async () => {
                                this.settings.rxSeparatorVisible = !this.settings.rxSeparatorVisible;
                                await this.saveSettingsCallback();
                                this.requestRender();
                            })
                        });
                        menu.addItem(item => {
                            item.setTitle(`${this.settings.otcSeparatorVisible ? "Hide" : "Show"} user group separator`);
                            item.setIcon(this.settings.otcSeparatorVisible ? "eye-off" : "eye");
                            item.onClick(async () => {
                                this.settings.otcSeparatorVisible = !this.settings.otcSeparatorVisible;
                                await this.saveSettingsCallback();
                                this.requestRender();
                            })
                        });
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

    private async moveRxGroup(groupName: string, up: boolean) {
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

        await this.saveSettingsCallback();
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
        const moveCallback = (up: boolean) => { return this.moveOtcGroup(tag, up); }
        const pinCallback = (pin: boolean) => { return this.pinOtcGroup(tag, pin); }

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
                (up: boolean) => { return this.moveRxGroup(groupName, up); },
                () => { return this.hideRxGroup(groupName); });
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

        this.rxSeparatorDiv = buildSeparator(
            "rx-separator",
            "oblogger-groups",
            "Built in groups"
        );
        body.appendChild(this.rxSeparatorDiv); 

        this.rxGroupsDiv = document.createElement("div");
        this.rxGroupsDiv.addClass("rx-groups");

        this.reloadRxGroups();

        body.appendChild(this.rxGroupsDiv);

        this.otcSeparatorDiv = buildSeparator(
            "otc-separator",
            "user-groups",
            "User created tag groups"
        );
        body.appendChild(this.otcSeparatorDiv);

        this.otcGroupsDiv = document.createElement("div");
        this.otcGroupsDiv.addClass("otc-groups");

        this.reloadOtcGroups();

        body.appendChild(this.otcGroupsDiv);
    }

    async onOpen() {
        this.containerEl.empty();

        const headerDiv = document.createElement("div");
        headerDiv.addClass("oblogger-header");
        this.buildHeaderInto(headerDiv);
        this.containerEl.appendChild(headerDiv);

        const bodyDiv = document.createElement("div");
        bodyDiv.addClass("oblogger-content");
        await this.buildBodyInto(bodyDiv);
        this.containerEl.appendChild(bodyDiv);

        this.requestRender();

    }
}
