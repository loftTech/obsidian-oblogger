import { App, prepareFuzzySearch, SuggestModal, TFile } from "obsidian";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif"
]);

export class ImageFileSuggestModal extends SuggestModal<TFile> {
    allImages: TFile[];

    onSelect: (image: TFile) => void;

    constructor(app: App, onSelect: (image: TFile) => void) {
        super(app);

        this.onSelect = onSelect;
        this.setPlaceholder("Type an image name");
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
                command: "esc",
                purpose: "to dismiss"
            }
        ])

        this.allImages = this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFile =>
                file instanceof TFile && SUPPORTED_IMAGE_EXTENSIONS.has(file.extension));
    }

    getSuggestions(query: string): TFile[] {
        const fuzzy = prepareFuzzySearch(query.trim());
        return this.allImages.filter((image: TFile) => {
            return fuzzy(image.name);
        });
    }

    renderSuggestion(image: TFile, el: HTMLElement) {
        el.createEl("div", { text: image.name });
        el.ariaLabel = image.path;
    }

    onChooseSuggestion(image: TFile) {
        this.onSelect(image);
    }
}
