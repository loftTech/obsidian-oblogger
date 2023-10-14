import { App, PopoverSuggest, prepareFuzzySearch } from "obsidian";

const CLOSE_OPTION = "CLOSE_OPTION";

export class StringPopoverSuggest extends PopoverSuggest<string> {
    app: App
    parentEl: HTMLElement;
    values: string[];
    selecting: boolean;
    onSelect: (value: string) => void;

    // defined at runtime by PopoverSuggest
    suggestions: { setSuggestions: (arg0: string[]) => void; }
    suggestEl: HTMLElement

    constructor(
        app: App,
        parentEl: HTMLElement,
        onSelect: (value: string) => void,
        values: string[]
    ) {
        super(app)
        this.app = app;
        this.parentEl = parentEl;
        // Make sure we're actually setting values to string[]
        this.values = values.map(v => String(v));
        this.selecting = false;
        this.onSelect = onSelect;

        // These two events work together to make sure we can both select
        // items from the popover and that the popover will close when we
        // click away. The click away is handled by the parent element's
        // `focusout` event. However, that event fires and is handled before
        // the `selectSuggestion()` function is called. So, we listen for
        // the `mousedown` event on the suggest element. When we see it,
        // we set a flag that puts us in the "selecting" state. If we leave
        // the parent element while in the selecting state, we assume that
        // the closing will be handled when `selectSuggestion()` is called.
        // If we aren't in the selecting state, we close.

        this.suggestEl.addEventListener('mousedown', () => {
            this.selecting = true;
        });

        this.parentEl.addEventListener('focusout', () => {
            if (!this.selecting) {
                this.close();
            }
        });

        // Show the popover when clicked
        this.parentEl.addEventListener('focusin', () => {
            this.suggestFrom("");
        })
    }

    renderSuggestion(value: string, el: HTMLElement) {
        if (value === CLOSE_OPTION) {
            el.setText("Close...");
            el.addClass("hidden-close-choice");
        } else {
            el.setText(value);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectSuggestion(value: never, evt: MouseEvent | KeyboardEvent) {
        if (value !== CLOSE_OPTION) {
            this.onSelect(String(value));
        }
        this.selecting = false;
        this.close();
    }

    suggestFrom(value: string) {
        if (this.values.length === 0) {
            this.selecting = false;
            this.close();
        }
        value = value.trim();
        const fuzzy = prepareFuzzySearch(value);
        const suggestions = this.values.filter((t: string) => fuzzy(t));
        if (suggestions.length === 0) {
            this.selecting = false;
            this.close();
            return;
        }
        this.suggestions.setSuggestions([CLOSE_OPTION].concat(suggestions));

        const rect = this.parentEl.getBoundingClientRect();
        this.suggestEl.style.width = rect.width + 'px'

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.reposition(rect);

        this.open();
    }
}
