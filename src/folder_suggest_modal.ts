import { App, Notice, SuggestModal, TFile, TFolder } from "obsidian";

interface FolderSelection {
    folderName: string;
    isCreator: boolean;
}

export class FolderSuggestModal extends SuggestModal<FolderSelection> {
    allFolders: string[];

    onSelect: (logPath: string) => void;

    constructor(app: App, excludedFolders: string[], onSelect: (logPath: string) => void) {
        super(app);

        this.scope.register(["Shift"], "Enter", async (event: KeyboardEvent) => {
            await this.onChooseSuggestion(
                { folderName: this.inputEl.value, isCreator: true },
                event);
            this.close();
        })

        this.onSelect = onSelect;
        this.setPlaceholder("Type a folder");
        this.setInstructions([
            {
                command: "↑↓",
                purpose: "to navigate"
            },
            {
                command: "↵",
                purpose: "to select"
            },
            {
                command: "shift ↵",
                purpose: "to create"
            },
            {
                command: "esc",
                purpose: "to dismiss"
            }
        ]);

        this.allFolders = this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFolder => {
                return (file instanceof TFolder) && !excludedFolders.contains(file.path)
            })
            .map((f) => f.path);
    }

    getSuggestions(query: string): FolderSelection[] {
        const folders = this.allFolders
            .filter((folder: string) =>
                folder.toLowerCase().includes(query.toLowerCase())
            ).sort((folderA: string, folderB: string) => {
                if (folderA === query) {
                    return -1;
                } else if (folderB === query) {
                    return 1;
                } else if (folderA < folderB) {
                    return -1;
                } else if (folderB < folderA) {
                    return 1;
                } else {
                    return 0;
                }
            }).map((folder: string) => {
                return { folderName: folder, isCreator: false }
            });
        if (folders.length === 0) {
            return [{folderName: query, isCreator: true}]
        } else {
            return folders;
        }
    }

    renderSuggestion(selection: FolderSelection, el: HTMLElement) {
        if (selection.isCreator && selection.folderName) {
            el.createEl("div", { text: `Create "${selection.folderName}" ...`})
        } else {
            el.createEl("div", { text: selection.folderName });
        }
    }

    async onChooseSuggestion(folder: FolderSelection, evt: MouseEvent | KeyboardEvent) {
        if (evt.shiftKey || folder.isCreator)  {
            const abstractFile = this.app.vault.getAbstractFileByPath(folder.folderName);
            if (!abstractFile) {
                // it doesn't exist as a file or folder, so create it as a folder
                await this.app.vault.createFolder(folder.folderName);
                new Notice(`Created logging folder at "${folder.folderName}"`);
            } else if (abstractFile instanceof TFile) {
                // it exists as a TFile, won't be able to log to this path
                new Notice(`Path ${folder.folderName} already exists as a file. Please choose a different path.`);
                return;
            }
        }
        new Notice(`Changed logging folder to "${folder.folderName}"`);
        this.onSelect(folder.folderName);
    }
}
