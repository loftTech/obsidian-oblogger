import { AbstractInputSuggest, App, prepareFuzzySearch } from "obsidian";

export class StringPopoverSuggest extends AbstractInputSuggest<string> {
    app: App
    values: string[];
    doSelection: (value: string) => void;

    constructor(
        app: App,
        textInputEl: HTMLInputElement,
        onSelect: (value: string) => void,
        values: string[]
    ) {
        super(app, textInputEl)
        // Make sure we're actually setting values to string[]
        this.values = values.map(v => `${v}`);
        this.doSelection = onSelect;
    }

    // This is marked as unused, but it's accessed at runtime by the obsidian api.
    // It must remain here.
    getSuggestions(): string[] {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const inputValue = this.textInputEl.value;

        // get fuzzy matches
        const fuzzy = prepareFuzzySearch(inputValue);
        const fuzzyMatches = this.values.filter((t: string) => fuzzy(t));

        // sort exact matches first
        return fuzzyMatches.sort((valueA, valueB) => {
            // Sort exact matches first
            if (valueA === inputValue) {
                return -1;
            }
            if (valueB == inputValue) {
                return 1;
            }

            // Fall back to sorting by default lessThan functions
            if (valueA < valueB) {
                return -1;
            }
            if (valueA > valueB) {
                return 1;
            }
            return 0;
        });
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string): void {
        this.doSelection(value);
    }
}
