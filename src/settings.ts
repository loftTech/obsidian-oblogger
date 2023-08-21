import { TFile } from "obsidian";

export interface OtcGroupSettings {
    tag: string;
    collapsedFolders: string[];
    isPinned: boolean;
    sortMethod?: string;
    sortAscending?: boolean;
}

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
            return "Alphabetical";
        case ContainerSortMethod.CTIME:
            return "Created";
        case ContainerSortMethod.MTIME:
            return "Modified";
        case ContainerSortMethod.TYPE:
            return "Type";
        case ContainerSortMethod.EXTENSION:
            return "Extension";
        default:
            return "";
    }
}

export const RxGroupType = {
    RECENTS: "recents",
    FILES: "files",
    UNTAGGED: "untagged",
    DAILIES: "dailies"
}

// TODO(#64): combine this with OtcGroupSettings
export interface RxGroupSettings {
    groupName: string;
    collapsedFolders: string[];
    isVisible: boolean;
    sortMethod: string;
    sortAscending: boolean;
}

export const PostLogAction = {
    QUIETLY: "quietly",
    OPEN: "open",
    COPY: "copy"
}

interface ObloggerSettings_v0 {
    loggingPath: string;
    avatarPath: string;
    tagGroups: OtcGroupSettings[];
    excludedFolders: string[];
    recentsCount: number;
    avatarVisible: boolean;
    postLogAction: string;
    rxGroups: RxGroupSettings[];
    dailiesTag: string;
}

interface ObloggerSettings_v1 extends ObloggerSettings_v0 {
    version: number;
}

interface ObloggerSettings_v2 extends ObloggerSettings_v1 {
    vaultVisible: boolean;
    clockVisible: boolean;
    rxSeparatorVisible: boolean;
}

export type ObloggerSettings = ObloggerSettings_v2

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
            newSettings.version = 2;
        }
    }
};

export const upgradeSettings = (currentVersion: number, settings: ObloggerSettings) => {
    const availableUpgrades = Object.keys(UPGRADE_FUNCTIONS);
    if (!availableUpgrades.contains(currentVersion.toString())) {
        console.warn(`Unable to upgrade ${currentVersion}. No upgrade function defined.`)
        return;
    }

    UPGRADE_FUNCTIONS[currentVersion](settings);
}

export const CURRENT_VERSION = 2;

export const DEFAULT_SETTINGS: Partial<ObloggerSettings> = {
    version: 2,
    avatarVisible: true,
    vaultVisible: true,
    clockVisible: false,
    rxSeparatorVisible: true,
    recentsCount: 10,
    postLogAction: PostLogAction.QUIETLY,
    rxGroups: [
        {
            groupName: RxGroupType.DAILIES,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true
        },
        {
            groupName: RxGroupType.FILES,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.TYPE,
            sortAscending: true
        },
        {
            groupName: RxGroupType.RECENTS,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true
        },
        {
            groupName: RxGroupType.UNTAGGED,
            collapsedFolders: [],
            isVisible: true,
            sortMethod: ContainerSortMethod.ALPHABETICAL,
            sortAscending: true
        }
    ],
    dailiesTag: "daily"
};

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
