import { FileAddedCallback, FileClickCallback } from "./group_folder";

export interface ContainerCallbacks {
    fileClickCallback: FileClickCallback;
    fileAddedCallback: FileAddedCallback;
    collapseChangedCallback: (groupName: string, collapsedFolders: string[], save: boolean) => void;
    requestRenderCallback: () => void;
    saveSettingsCallback: () => Promise<void>;
    getGroupIconCallback: (isCollapsed: boolean) => string,
    hideCallback: () => void;
    moveCallback: (up: boolean) => void;
    pinCallback: ((pin: boolean) => void) | undefined;
}
