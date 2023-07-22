import { App, FuzzySuggestModal, Notice } from "obsidian";


export class NewTagModal extends FuzzySuggestModal<string> {
    onSelect: (tag: string) => void

    constructor(app: App, onSelect: (tag: string) => Promise<void>) {
        super(app);
        this.onSelect = onSelect;
    }
    getItems(): string[] {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return Object.keys(this.app.metadataCache.getTags());
    }

    getItemText(tag: string): string {
        return tag;
    }

    // evt isn't used, but we need it to handle the onChooseItem
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onChooseItem(value: string, evt: MouseEvent | KeyboardEvent) {
        new Notice(`Selected ${value}`);
        const tag = value.startsWith("#") ? value.substring(1) : value;
        this.onSelect(tag);
    }
}
