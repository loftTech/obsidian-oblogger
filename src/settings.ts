import { TFile } from "obsidian";

export interface TagGroup {
    tag: string;
    collapsedFolders: string[];
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
    ENTRIES: "entries"
}

interface RxGroupSettings {
    groupName: string,
    collapsedFolders: string[],
    isVisible: boolean,
    sortMethod: string,
    sortAscending: boolean
}

export const PostLogAction = {
    QUIETLY: "quietly",
    OPEN: "open",
    COPY: "copy"
}

export interface ObloggerSettings {
    loggingPath: string;
    avatarPath: string;
    tagGroups: TagGroup[];
    excludedFolders: string[];
    recentsCount: number;
    avatarVisible: boolean;
    postLogAction: string;
    rxGroups: RxGroupSettings[];
    entriesTag: string;
}

export const DEFAULT_SETTINGS: Partial<ObloggerSettings> = {
    recentsCount: 10,
    postLogAction: PostLogAction.QUIETLY,
    rxGroups: [
        {
            groupName: RxGroupType.ENTRIES,
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
    entriesTag: "entry"
};

export enum FileType {
    image = "image",
    audio = "audio",
    video = "video",
    pdf = "pdf",
    md = "md",
    canvas = "canvas",
    code = "code",
    html = "html"
}

const UNKNOWN_FILE_TYPE_ICON = "file-question";

const DEFAULT_IMAGE_ICON = "image";
const DEFAULT_NATIVE_IMAGE_ICON = "file-image";
const DEFAULT_AUDIO_ICON = "file-audio";
const DEFAULT_VIDEO_ICON = "file-video";
const DEFAULT_PDF_ICON = "file-text";
const DEFAULT_MD_ICON = "file";
const DEFAULT_CANVAS_ICON = "layout-dashboard";
const DEFAULT_CODE_ICON = "file-json-2";
const DEFAULT_HTML_ICON = "file-code";

export const FILE_EXTENSION_TYPES = new Map([
    ["bmp", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["png", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["jpg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["jpeg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["gif", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["svg", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],
    ["webp", { type: FileType.image, icon: DEFAULT_IMAGE_ICON }],

    ["psd", { type: FileType.image, icon: DEFAULT_NATIVE_IMAGE_ICON }],

    ["mp3", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["wav", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["m4a", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["3gp", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["flac", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["ogg", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["oga", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],
    ["opus", { type: FileType.audio, icon: DEFAULT_AUDIO_ICON }],

    ["mp4", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["webm", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["ogv", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mov", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mkv", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["avi", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mpg", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],
    ["mpeg", { type: FileType.video, icon: DEFAULT_VIDEO_ICON }],

    ["pdf", { type: FileType.pdf, icon: DEFAULT_PDF_ICON }],

    ["md", { type: FileType.md, icon: DEFAULT_MD_ICON }],

    ["canvas", { type: FileType.canvas, icon: DEFAULT_CANVAS_ICON }],

    ["json", { type: FileType.code, icon: DEFAULT_CODE_ICON }],
    ["css", { type: FileType.code, icon: DEFAULT_CODE_ICON }],
    ["js", { type: FileType.code, icon: DEFAULT_CODE_ICON }],

    ["html", { type: FileType.html, icon: DEFAULT_HTML_ICON }],
]);

export const getFileType = (extension: string): string | undefined => {
    return FILE_EXTENSION_TYPES.get(extension)?.type;
}

export const getFileTypeIcon = (file: TFile) : string => {
    return FILE_EXTENSION_TYPES.get(file.extension)?.icon ?? UNKNOWN_FILE_TYPE_ICON;
}
