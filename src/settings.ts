// We're using deprecated symbols in this because we're loading possibly old
// json settings, and we want to keep track of previous (now deprecated) versions
// of the settings objects
// noinspection JSDeprecatedSymbols

import { TFile } from "obsidian";

export const ContainerSortMethod = {
    ALPHABETICAL: "alphabetical",
    CTIME: "ctime",
    MTIME: "mtime",
    TYPE: "type",
    EXTENSION: "extension"
};

export const getSortMethodDisplayText = (sortMethod: string) => {
    switch(sortMethod) {
        case ContainerSortMethod.ALPHABETICAL:
            return "Abc";
        case ContainerSortMethod.CTIME:
            return "Created";
        case ContainerSortMethod.MTIME:
            return "Modified";
        case ContainerSortMethod.TYPE:
            return "Type";
        case ContainerSortMethod.EXTENSION:
            return "Ext";
        default:
            return "";
    }
}

// Note: when adding new types, ensure that the value = NAME.toLowerCase()
export enum RxGroupType {
    RECENTS = "recents",
    FILES = "files",
    UNTAGGED = "untagged",
    DAILIES = "dailies"
}

export const isValidRxGroupType = (groupType: RxGroupType): boolean => {
    return Object.keys(RxGroupType)
        .map(t => t.toLowerCase())
        .contains(groupType as string);
}

// Note: when adding new types, ensure that the value = NAME.toLowerCase()
export enum OtcGroupType {
    TAG_GROUP = "tag_group",
    PROPERTY_GROUP = "property_group",
    FOLDER_GROUP = "folder_group"
}

export const isValidOtcGroupType = (groupType: OtcGroupType): boolean => {
    return Object.keys(OtcGroupType)
        .map(t => t.toLowerCase())
        .contains(groupType as string);
}

export type GroupType = RxGroupType | OtcGroupType;

export const isValidGroupType = (groupType: GroupType): boolean => {
    return (
        isValidRxGroupType(groupType as RxGroupType) ||
        isValidOtcGroupType(groupType as OtcGroupType)
    );
}

/**
 * @description:validates that the enums are properly formed (that the
 * key.toLowerCase() equals the value). should be called on launch (or better
 * yet, at compile time).
 */
export const areEnumsValid = (): boolean => {
    const allEnums = Object
        .entries(RxGroupType)
        .map((rxGroupType) => {
            return [rxGroupType.first(), String(rxGroupType.last())];
        }).concat(
            Object
                .entries(OtcGroupType)
                .map((otcGroupType) => {
                    return [otcGroupType.first(), String(otcGroupType.last())];
                })
        );
    return !allEnums
        .some(groupType => {
            return groupType.first()?.toLowerCase() !== groupType.last();
        });
}

interface RxGroupSettings_v0 {
    groupName: string;
    collapsedFolders?: string[];
    isVisible: boolean;
    sortMethod: string;
    sortAscending: boolean;
}

interface RxGroupSettings_v1 extends RxGroupSettings_v0 {
    excludedFolders: string[];
    templatesFolderVisible: boolean;
    logsFolderVisible: boolean;
}

/**
 * @deprecated Use {@link GroupSettings} instead
 */
export type RxGroupSettings = RxGroupSettings_v1;

interface OtcGroupSettings_v0 {
    tag: string;
    collapsedFolders?: string[];
    isPinned: boolean;
    sortMethod?: string;
    sortAscending?: boolean;
}

interface OtcGroupSettings_v1 extends OtcGroupSettings_v0 {
    excludedFolders: string[];
    templatesFolderVisible: boolean;
    logsFolderVisible: boolean;
}

/**
 * @deprecated Use {@link GroupSettings} instead
 */
export type OtcGroupSettings = OtcGroupSettings_v1;

export interface GroupSettings_v0 {
    groupName: string;
    /**
     * @deprecated Use {@link GroupSettings_v2.openFolders}
     */
    collapsedFolders?: string[];
    isPinned: boolean;
    isVisible: boolean;
    sortMethod: string;
    sortAscending: boolean;
    excludedFolders: string[];
    templatesFolderVisible: boolean;
    logsFolderVisible: boolean;
}

export interface GroupSettings_v1 extends GroupSettings_v0 {
    groupType: GroupType;
}

export interface GroupSettings_v2 extends GroupSettings_v1 {
    openFolders: string[];
}

export type GroupSettings = GroupSettings_v2;


export const getSortValue = (groupSettings: GroupSettings, vaultName: string): string => {
    switch (groupSettings.groupType as OtcGroupType) {
        case OtcGroupType.TAG_GROUP: {
            const pattern = "\\.\\.\\./(.*)/\\.\\.\\.";
            const tag = groupSettings.groupName.match(pattern)?.at(1) ?? groupSettings.groupName;
            return tag.split("/").last() ?? "";
        } case OtcGroupType.FOLDER_GROUP: {
            if (groupSettings.groupName === "/") {
                return vaultName;
            }
            return groupSettings.groupName.split("/").last() ?? groupSettings.groupName;
        } default:
            return groupSettings.groupName;
    }
}

export const PostLogAction = {
    QUIETLY: "quietly",
    OPEN: "open",
    COPY: "copy"
}

interface ObloggerSettings_v0 {
    loggingPath: string;
    avatarPath: string;
    tagGroups: OtcGroupSettings_v0[];
    /**
     * @deprecated Use {@link OtcGroupSettings_v1.excludedFolders} and
     * {@link RxGroupSettings_v1.excludedFolders} instead
     */
    excludedFolders?: string[];
    recentsCount: number;
    avatarVisible: boolean;
    postLogAction: string;
    rxGroups: RxGroupSettings_v0[];
    dailiesTag: string;
}

interface ObloggerSettings_v1 extends ObloggerSettings_v0 {
    version: number;
}

interface ObloggerSettings_v2 extends ObloggerSettings_v1 {
    vaultVisible: boolean;
    clockVisible: boolean;
    rxSeparatorVisible: boolean;
    otcSeparatorVisible: boolean;
}

interface ObloggerSettings_v3 extends ObloggerSettings_v2 {
    /**
     * @deprecated Use {@link ObloggerSettings_v4.otcGroups} instead
     */
    tagGroups: OtcGroupSettings_v1[];
    rxGroups: RxGroupSettings_v1[];
}

interface ObloggerSettings_v4 extends ObloggerSettings_v3 {
    rxGroups: GroupSettings_v0[];
    otcGroups: GroupSettings_v0[];
}

interface ObloggerSettings_v5 extends ObloggerSettings_v4 {
    rxGroups: GroupSettings_v1[];
    otcGroups: GroupSettings_v1[];
}

type ObloggerSettings_v6 = ObloggerSettings_v5

interface ObloggerSettings_v7 extends ObloggerSettings_v6 {
    rxGroups: GroupSettings_v2[];
    otcGroups: GroupSettings_v2[];
}

export type ObloggerSettings = ObloggerSettings_v7;

const UPGRADE_FUNCTIONS: {[id: number]: (settings: ObloggerSettings) => void } = {
    0: (settings: ObloggerSettings) => {
        const newSettings = settings as ObloggerSettings_v1;
        if (newSettings) {
            newSettings.version = 1;
        }
    },
    1: (settings: ObloggerSettings) => {
        const newSettings = settings as ObloggerSettings_v2;
        if (newSettings) {
            newSettings.vaultVisible = true;
            newSettings.clockVisible = false;
            newSettings.rxSeparatorVisible = true;
            newSettings.otcSeparatorVisible = true;
            newSettings.version = 2;
        }
    },
    2: (settings: ObloggerSettings) => {
        const newSettings = settings as ObloggerSettings_v3;
        if (newSettings) {
            newSettings.rxGroups.forEach(group => {
                group.logsFolderVisible = [
                    RxGroupType.DAILIES as string,
                    RxGroupType.FILES as string,
                    RxGroupType.RECENTS as string
                ].contains(group.groupName);

                group.templatesFolderVisible = [
                    RxGroupType.FILES as string,
                    RxGroupType.RECENTS as string
                ].contains(group.groupName);

                group.excludedFolders = [];
            });
            // This is deprecated in a later version. It's okay that we're using
            // it here because it will be upgraded shortly...
            newSettings.tagGroups.forEach(group => {
                group.logsFolderVisible = false;
                group.templatesFolderVisible = false;
                group.excludedFolders = [];
            });
            newSettings.version = 3;
        }
    },
    3: (settings: ObloggerSettings) => {
        const newSettings = settings as ObloggerSettings_v4;
        if (newSettings) {
            newSettings.rxGroups.forEach(group => {
                group.isPinned = false;
            });

            // Transfer the data from the deprecated tagGroups to the new otcGroups
            newSettings.otcGroups = newSettings.tagGroups.map(tagGroup => {
                return {
                    groupName: tagGroup.tag,
                    collapsedFolders: tagGroup.collapsedFolders ?? [],
                    isPinned: tagGroup.isPinned ?? false,
                    isVisible: true,
                    sortMethod: tagGroup.sortMethod ?? ContainerSortMethod.ALPHABETICAL,
                    sortAscending: tagGroup.sortAscending ?? true,
                    excludedFolders: tagGroup.excludedFolders ?? [],
                    templatesFolderVisible: tagGroup.templatesFolderVisible ?? false,
                    logsFolderVisible: tagGroup.logsFolderVisible ?? false
                }
            });
            // Clear the now deprecated option
            newSettings.tagGroups = [];

            newSettings.version = 4;
        }
    },
    4: (settings: ObloggerSettings) => {
        const newSettings = settings as ObloggerSettings_v5;
        if (newSettings) {
            // Rx groups used to have their type as their name, so make sure
            // we only have valid rx group types in the names and then transfer
            // the name to the type, clearing the name.
            newSettings.rxGroups
                .filter(group => {
                    return isValidRxGroupType(group.groupName as RxGroupType);
                }).map(group => {
                    group.groupType = group.groupName as RxGroupType;
                    group.groupName = "";
                    return group;
                });

            // All otc groups from <= v4 are tag groups. The names are
            // correctly the tag their filtering on, so just set the type
            newSettings.otcGroups.forEach(group => {
                group.groupType = OtcGroupType.TAG_GROUP;
            });

            newSettings.version = 5;
        }
    },
    5: (settings: ObloggerSettings) => {
        // Upgrading from 5 to 6 was because of the addition of FolderGroups as a new type
        const newSettings = settings as ObloggerSettings_v6;
        if (newSettings) {
            newSettings.version = 6;
        }
    },
    6: (settings: ObloggerSettings) => {
        //upgrading from 6 to 7 is because group settings "collapsedFolders" was changed to "openFolders"
        const newSettings = settings as ObloggerSettings_v7
        if (newSettings) {
            newSettings.version = 7;
        }
    }
};

/**
 * Takes in a version number and a settings object and attempts to upgrade
 * the settings object to the next version.
 * @param currentVersion Current version of the settings object
 * @param settings Settings object to upgrade
 */
export const upgradeSettings = (currentVersion: number, settings: ObloggerSettings) => {
    const availableUpgrades = Object.keys(UPGRADE_FUNCTIONS);
    if (!availableUpgrades.contains(currentVersion.toString())) {
        console.warn(`Unable to upgrade ${currentVersion}. No upgrade function defined.`)
        return;
    }

    UPGRADE_FUNCTIONS[currentVersion](settings);
}

export const CURRENT_VERSION = 7;

export const DEFAULT_SETTINGS: ObloggerSettings_v3 = {
    version: 3,
    avatarVisible: true,
    vaultVisible: true,
    clockVisible: false,
    rxSeparatorVisible: true,
    otcSeparatorVisible: true,
    recentsCount: 10,
    postLogAction: PostLogAction.QUIETLY,
    // this is deprecated, but it's expected here in v3, it'll be removed in v4
    tagGroups: [],
    loggingPath: "",
    avatarPath: "",
    rxGroups: [
        {
            groupName: RxGroupType.DAILIES,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true,
            logsFolderVisible: true,
            templatesFolderVisible: false,
            excludedFolders: []
        },
        {
            groupName: RxGroupType.FILES,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.TYPE,
            sortAscending: true,
            logsFolderVisible: true,
            templatesFolderVisible: true,
            excludedFolders: []
        },
        {
            groupName: RxGroupType.RECENTS,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true,
            logsFolderVisible: true,
            templatesFolderVisible: true,
            excludedFolders: []
        },
        {
            groupName: RxGroupType.UNTAGGED,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true,
            logsFolderVisible: false,
            templatesFolderVisible: false,
            excludedFolders: []
        }
    ],
    dailiesTag: "daily"
};

export const getGroupSettings = (
    settings: ObloggerSettings,
    groupType: GroupType,
    groupName: string
): GroupSettings | undefined => {
    return [
        ...settings.otcGroups,
        ...settings.rxGroups
    ].find((group: GroupSettings) => {
        return group.groupType === groupType && group.groupName === groupName
    });
}

export enum FileType {
    image = "image",
    audio = "audio",
    video = "video",
    md = "md",
    canvas = "canvas",
    code = "code",
    html = "html",
    archive = "archive",
    text = "text"
}

const UNKNOWN_FILE_TYPE_ICON = "file-question";

const DEFAULT_IMAGE_ICON = "image";
const DEFAULT_NATIVE_IMAGE_ICON = "file-image";
const DEFAULT_AUDIO_ICON = "file-audio";
const DEFAULT_VIDEO_ICON = "file-video";
const DEFAULT_TEXT_ICON = "file-type";
const DEFAULT_MD_ICON = "file-text";
const DEFAULT_CANVAS_ICON = "layout-dashboard";
const DEFAULT_CODE_ICON = "file-json-2";
const DEFAULT_HTML_ICON = "file-code";
const DEFAULT_ARCHIVE_ICON = "folder-archive";

export const FILE_EXTENSION_TYPES = new Map([
    ["bmp", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["gif", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["heic", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["jpeg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["jpg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["png", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["svg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["tiff", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["webp", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],

    ["obj", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],
    ["procreate", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],
    ["psd", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],
    ["usdz", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],
    ["xcf", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],

    ["3gp", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["flac", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["m4a", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["mp3", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["oga", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["ogg", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["opus", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["wav", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],

    ["avi", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["hevc", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mkv", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mov", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mp4", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mpeg", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mpg", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["ogv", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["webm", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],

    ["docx", { type: FileType.text, icon: DEFAULT_TEXT_ICON }],
    ["pdf", { type: FileType.text, icon: DEFAULT_TEXT_ICON }],
    ["rtf", { type: FileType.text, icon: DEFAULT_TEXT_ICON }],
    ["txt", { type: FileType.text, icon: DEFAULT_TEXT_ICON }],

    ["md", { type: FileType.md, icon: DEFAULT_MD_ICON }],

    ["canvas", { type: FileType.canvas, icon: DEFAULT_CANVAS_ICON }],

    ["css", { type: FileType.code, icon: DEFAULT_CODE_ICON }],
    ["js", { type: FileType.code, icon: DEFAULT_CODE_ICON }],
    ["json", { type: FileType.code, icon: DEFAULT_CODE_ICON }],
    ["ts", { type: FileType.code, icon: DEFAULT_CODE_ICON }],

    ["html", { type: FileType.html, icon: DEFAULT_HTML_ICON }],

    ["7z", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["apk", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["dmg", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["gz", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["iso", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["jar", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["rar", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["tar", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["war", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["wim", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["xar", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["xz", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["zip", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
    ["zipx", { type: FileType.archive, icon: DEFAULT_ARCHIVE_ICON}],
]);

export const getFileType = (extension: string): string | undefined => {
    return FILE_EXTENSION_TYPES.get(extension)?.type;
}

export const getFileTypeIcon = (file: TFile) : string => {
    return FILE_EXTENSION_TYPES.get(file.extension)?.icon ?? UNKNOWN_FILE_TYPE_ICON;
}
