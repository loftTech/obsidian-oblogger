import {
    ButtonComponent,
    CachedMetadata,
    ItemView,
    Menu,
    moment,
    Notice,
    setIcon,
    TFile,
    WorkspaceLeaf
} from "obsidian";
import {
    areEnumsValid,
    ContainerSortMethod,
    getGroupSettings,
    GroupSettings,
    isValidRxGroupType,
    ObloggerSettings,
    OtcGroupType,
    RxGroupType
} from "./settings";
import { TagGroupContainer } from "./containers/otc/tag_group_container";
import { DailiesContainer } from "./containers/rx/dailies_container";
import { FileClickCallback, GroupFolder } from "./containers/group_folder";
import { RecentsContainer } from "./containers/rx/recents_container";
import { UntaggedContainer } from "./containers/rx/untagged_container";
import { FilesContainer } from "./containers/rx/files_container";
import { ImageFileSuggestModal } from "./image_file_suggest_modal";
import { ViewContainer } from "./containers/view_container";
import { buildSeparator } from "./misc_components";
import { NewTagModal } from "./new_tag_modal";
import { buildStateFromFile, FileState } from "./constants";
import { ContainerCallbacks } from "./containers/container_callbacks";
import { PropertyContainer } from "./containers/otc/property_container";
import { NewPropertyModal } from "./new_property_modal";

export const VIEW_TYPE_OBLOGGER = "oblogger-view";
const RENDER_DELAY_MS = 100;

declare module "obsidian" {
    interface App {
        loadLocalStorage(key: string): string | null;
        saveLocalStorage(key: string, value: string | undefined): void;
    }
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
    otcContainers: ViewContainer[];
    rxContainers: ViewContainer[];
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

    constructor(
        leaf: WorkspaceLeaf,
        showLoggerCallbackFn: () => Promise<void>,
        settings: ObloggerSettings,
        saveSettingsCallback: () => Promise<void>
    ) {
        super(leaf);

        // If there's a way to do this at compile time, then we should do that.
        // But for now, a console assert is better than nothing.
        console.assert(areEnumsValid());

        this.fullRender = true;
        this.settings = settings;
        this.showLoggerCallbackFn = showLoggerCallbackFn;
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
                        .setTitle("Open in new tab")
                        .setSection("open")
                        .setIcon("lucide-file-plus")
                        .onClick(async () => {
                            return app.workspace.openLinkText(file.path, file.path, "tab");
                        })
                );

                menu.addItem((item) =>
                    item
                        .setTitle("Open to the right")
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

                menu.addItem((item) => {
                    item
                        .setTitle("Delete")
                        .setSection("danger")
                        .setIcon("trash")
                        .onClick(async () => {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.app.fileManager.promptForDeletion(file);
                        });
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    item.dom.addClass("is-warning")
                });

                menu.addItem((item) =>
                    item
                        .setTitle("Rename...")
                        .setSection("action")
                        .setIcon("pencil")
                        .onClick(async () => {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            this.app.fileManager.promptForFileRename(file);
                        })
                );

                if ("screenX" in e) {
                    menu.showAtPosition({ x: e.pageX, y: e.pageY });
                } else {
                    // noinspection JSUnresolvedReference
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
        this.rxContainers.concat(this.otcContainers)
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
        return "orbit";
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

    private renderContainers(containers: ViewContainer[], modifiedFiles: FileState[]) {
        containers.forEach(container => this.renderContainer(container, modifiedFiles));
    }

    private renderContainer(container: ViewContainer, modifiedFiles: FileState[]) {
        const groupSettings = getGroupSettings(
            this.settings,
            container.groupType,
            container.groupName);

        if (!groupSettings) {
            console.warn(
                `Unable to find settings for container of type 
                ${container.groupType} with name ${container.groupName}`);
            return;
        }

        container.render(modifiedFiles, false, groupSettings);
    }

    private async renderNow(modifiedFiles: FileState[]) {
        await this.renderAvatar();
        await this.renderVault();
        this.renderClock(this.clockDiv);
        this.renderRXSeparator();
        this.renderOTCSeparator();

        // render rx containers
        Object.values(RxGroupType).forEach(groupType => {
            const containers = this.rxContainers.filter(container => container.groupType === groupType);
            this.renderContainers(containers, modifiedFiles);
        });

        // render otc containers
        Object.values(OtcGroupType).forEach(groupType => {
            const containers = this.otcContainers.filter(container => container.groupType === groupType);
            this.renderContainers(containers, modifiedFiles);
        });

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
        setIcon(defaultAvatarDiv, "orbit");
        defaultAvatarDiv.addClass("greeter-title-default-avatar");
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

    private showNewPropertyModal() {
        const modal = new NewPropertyModal(this.app, async (result: string) => {
            if (!this.settings.otcGroups) {
                this.settings.otcGroups = [];
            }
            // add the group to settings and then reload
            this.settings.otcGroups.push({
                groupName: result,
                groupType: OtcGroupType.PROPERTY_GROUP,
                collapsedFolders: [],
                isVisible: true,
                isPinned: false,
                sortMethod: ContainerSortMethod.ALPHABETICAL,
                sortAscending: true,
                excludedFolders: [],
                logsFolderVisible: false,
                templatesFolderVisible: false
            });
            await this.saveSettingsCallback();
            this.reloadOtcGroups();
        });
        modal.open();
    }

    private showNewTagModal() {
        const modal = new NewTagModal(this.app, async (result: string)=> {
            if (!this.settings.otcGroups) {
                this.settings.otcGroups = [];
            }
            // add the group to settings and then reload
            this.settings.otcGroups.push({
                groupName: result,
                groupType: OtcGroupType.TAG_GROUP,
                collapsedFolders: [],
                isVisible: true,
                isPinned: false,
                sortMethod: ContainerSortMethod.ALPHABETICAL,
                sortAscending: true,
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
            .setIcon("dog")
            .onClick(() => this.showNewPropertyModal());

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
                            item.setTitle(`${isVisible ? "Hide" : "Show"} ${groupSetting.groupType}`);
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

    private async removeOtcGroup(groupType: OtcGroupType, groupName: string) {
        const containers = this.otcContainers.filter(container => {
            return (
                container.groupType === groupType &&
                container.groupName === groupName);
        });
        const container = containers.first();
        if (container === undefined) {
            new Notice(`Unable to find group of type ${groupType} with name ${groupName}`);
            return;
        }
        if (container.groupName !== groupName) {
            console.debug("Something went wrong, container has the wrong name.");
            return;
        }
        this.otcContainers.remove(container);
        container.rootElement.remove();
        this.settings.otcGroups = this.settings?.otcGroups
            .filter(group => {
                return group.groupName !== groupName || group.groupType != groupType
            });
        await this.saveSettingsCallback();
        this.requestRender();
        new Notice(`"${groupName}" removed`);
    }

    private async moveRxGroup(groupType: RxGroupType, up: boolean) {
        if (!this.settings) {
            return;
        }

        const currentIndex = this.settings.rxGroups.findIndex(group => group.groupType === groupType);
        if (currentIndex === -1) {
            console.warn(`Rx group with type ${groupType} doesn't exist.`);
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

    private async moveOtcGroup(
        groupType: OtcGroupType,
        groupName: string,
        up: boolean
    ): Promise<void> {
        const otcGroups = this.settings.otcGroups;
        const currentIndex = otcGroups.findIndex((group) => {
            return group.groupType === groupType && group.groupName === groupName;
        });
        if (currentIndex === -1) {
            console.warn(`Group of type ${groupType} with name ${groupName} couldn't be found.`);
            return;
        }

        // find the next group of the same type
        let newIndex = currentIndex + (up ? -1 : 1);
        while (newIndex > 0 && otcGroups.at(newIndex)?.groupType !== groupType) {
            newIndex += (up ? -1 : 1);
        }

        if (newIndex < 0 || newIndex >= otcGroups.length) {
            console.log(`Already at ${up ? "top" : "bottom"}`);
            return;
        }

        // todo(#215): try to get this to one operation using splice to swap in place
        const group = otcGroups[currentIndex];
        otcGroups.remove(group);
        otcGroups.splice(newIndex, 0, group);

        await this.saveSettingsCallback();
        this.reloadOtcGroups();
        this.requestRender();
    }

    private async pinOtcGroup(
        groupType: OtcGroupType,
        groupName: string,
        pin: boolean
    ): Promise<void> {
        const groupSettings = getGroupSettings(this.settings, groupType, groupName);
        if (groupSettings === undefined) {
            new Notice(`Unable to find group type ${groupType} with name ${groupName} to ${pin ? "pin" : "unpin"}`);
            return;
        }
        groupSettings.isPinned = pin;
        await this.saveSettingsCallback();
        this.reloadOtcGroups();
        this.requestRender();
    }

    private addTagGroup(
        groupName: string,
        isPinned: boolean,
        parent: HTMLElement
    ) {
        const callbacks: ContainerCallbacks = {
            fileClickCallback: this.fileClickCallback,
            fileAddedCallback: this.fileAddedCallback,
            requestRenderCallback: () => { this.requestRender() },
            saveSettingsCallback: this.saveSettingsCallback,
            getGroupIconCallback: (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            hideCallback: async () => { return await this.removeOtcGroup(OtcGroupType.TAG_GROUP, groupName); },
            moveCallback: (up: boolean) => { return this.moveOtcGroup(OtcGroupType.TAG_GROUP, groupName, up); },
            pinCallback: (pin: boolean) => { return this.pinOtcGroup(OtcGroupType.TAG_GROUP, groupName, pin); }
        };

        const container = new TagGroupContainer(
            this.app,
            groupName,
            this.settings,
            isPinned,
            callbacks);

        this.otcContainers.push(container);

        parent.appendChild(container.rootElement);
        this.requestRender();
    }

    private addPropertyGroup(
        groupName: string,
        isPinned: boolean,
        parent: HTMLElement
    ) {
        const callbacks: ContainerCallbacks = {
            fileClickCallback: this.fileClickCallback,
            fileAddedCallback: this.fileAddedCallback,
            requestRenderCallback: () => { this.requestRender() },
            saveSettingsCallback: this.saveSettingsCallback,
            getGroupIconCallback: (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
            hideCallback: async () => { return await this.removeOtcGroup(OtcGroupType.PROPERTY_GROUP, groupName); },
            moveCallback: (up: boolean) => { return this.moveOtcGroup(OtcGroupType.PROPERTY_GROUP, groupName, up); },
            pinCallback: (pin: boolean) => { return this.pinOtcGroup(OtcGroupType.PROPERTY_GROUP, groupName, pin); }
        };

        const container = new PropertyContainer(
            this.app,
            this.settings,
            callbacks,
            groupName,
            isPinned);

        this.otcContainers.push(container);

        parent.appendChild(container.rootElement);
        this.requestRender();
    }

    private reloadPropertyGroups(groups: GroupSettings[]) {
        const groupSorter = (a: GroupSettings, b: GroupSettings): number => {
            return a.groupName < b.groupName ? -1 : a.groupName > b.groupName ? -1 : 0;
        }

        // Add pinned groups
        groups
            ?.filter(otcGroup => otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addPropertyGroup(
                    group.groupName,
                    true,
                    this.otcGroupsDiv);
            });

        // Add unpinned groups
        groups
            ?.filter(otcGroup => !otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addPropertyGroup(
                    group.groupName,
                    false,
                    this.otcGroupsDiv);
            });
    }

    private reloadTagGroups(groups: GroupSettings[]) {
        const groupSorter = (a: GroupSettings, b: GroupSettings): number => {
            const pattern = "\\.\\.\\./(.*)/\\.\\.\\.";
            const aTag = a.groupName.match(pattern)?.at(1) ?? a.groupName;
            const bTag = b.groupName.match(pattern)?.at(1) ?? b.groupName;
            const aChildTag = aTag.split("/").last() ?? "";
            const bChildTag = bTag.split("/").last() ?? "";
            return aChildTag < bChildTag ? -1 : aChildTag > bChildTag ? 1 : 0
        }

        // Add pinned groups
        groups
            ?.filter(otcGroup => otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addTagGroup(
                    group.groupName,
                    true,
                    this.otcGroupsDiv);
            });

        // Add unpinned groups
        groups
            ?.filter(otcGroup => !otcGroup.isPinned)
            ?.sort(groupSorter)
            ?.forEach(group => {
                this.otcGroupsDiv && this.addTagGroup(
                    group.groupName,
                    false,
                    this.otcGroupsDiv);
            });
    }

    private reloadOtcGroups() {
        // Try to get the containers to clean up after themselves
        this.otcContainers?.forEach(container => container.rootElement.remove());
        this.otcContainers = [];

        // Dump whatever remains (hopefully not much)
        this.otcGroupsDiv?.empty();

        Object.values(OtcGroupType).forEach(groupType => {
            const groups = this.settings?.otcGroups
                .filter(group => group.groupType === groupType)
            switch(groupType) {
                case OtcGroupType.TAG_GROUP:
                    this.reloadTagGroups(groups);
                    break;
                case OtcGroupType.PROPERTY_GROUP:
                    this.reloadPropertyGroups(groups);
                    break;
            }
        });
    }

    private async hideRxGroup(groupType: RxGroupType) {
        if (!isValidRxGroupType(groupType)) {
            console.warn(`Unknown rx group type: ${groupType}. Not hiding.`);
            return;
        }

        const groupSetting = getGroupSettings(this.settings, groupType, "")
        if (!groupSetting) {
            console.warn(`Unable to find settings for group type ${groupType}`)
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

        this.rxContainers?.forEach(container => container.rootElement.remove());
        this.rxContainers = [];

        const getRxType = (groupType: RxGroupType) => {
            switch(groupType) {
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

        const createRxGroup = (groupType: RxGroupType) => {
            if (!isValidRxGroupType(groupType)) {
                console.warn(`Unknown rx group type ${groupType}. Not creating.`);
                return;
            }
            const ctor = getRxType(groupType);
            const callbacks: ContainerCallbacks = {
                fileClickCallback: this.fileClickCallback,
                fileAddedCallback: this.fileAddedCallback,
                requestRenderCallback: () => { this.requestRender() },
                saveSettingsCallback: this.saveSettingsCallback,
                getGroupIconCallback: (isCollapsed) => isCollapsed ? "folder-closed" : "folder-open",
                hideCallback: () => { return this.hideRxGroup(groupType); },
                moveCallback: (up: boolean) => { return this.moveRxGroup(groupType, up); },
                pinCallback: undefined
            }
            return new ctor(
                this.app,
                this.settings,
                callbacks);
        }

        this.rxContainers = [];
        this.settings?.rxGroups.forEach(rxGroupSetting => {
            const newGroup = createRxGroup(rxGroupSetting.groupType as RxGroupType);
            if (newGroup) {
                this.rxContainers.push(newGroup);
            }
        })

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
