import {
    App,
    FrontMatterCache,
    Modal,
    moment,
    normalizePath,
    Notice,
    setIcon,
    TAbstractFile,
    TextAreaComponent,
    TextComponent,
    TFile,
    TFolder
} from "obsidian";
import { ObloggerSettings, PostLogAction } from "./settings";
import { StringPopoverSuggest } from "./string_popover_suggest";
import { FolderSuggestModal } from "./folder_suggest_modal";
import { buildSeparator } from "./misc_components";

const TIME_FORMAT = "HH:mm:ss";

const EXCLUDED_FIELDS = new Set([
    "time",
    "day",
    "date",
    "type",
    "cssclass",
    "position"
]);

export class LoggerModal extends Modal {
    settings: ObloggerSettings;
    logMap: Map<string, TFile[]>
    typeInput: TextComponent | undefined
    fieldsDiv: HTMLElement | undefined
    logFrontmatter: {[id: string]: string};
    logContent: string;
    submitButton: HTMLElement | undefined;
    logChoiceContainer: HTMLElement | undefined;
    currentPostLogSelection: string;
    saveSettingsCallback: () => Promise<void>;

    constructor(
        app: App,
        settings: ObloggerSettings,
        saveSettingsCallback: () => Promise<void>
    ) {
        super(app);

        this.settings = settings;
        this.currentPostLogSelection = this.settings.postLogAction;
        this.logMap = this.gatherLogMap();
        this.logFrontmatter = {};
        this.logContent = "";

        this.saveSettingsCallback = saveSettingsCallback;

        this.containerEl.addClass("logger");
    }

    private gatherLogMap(): Map<string, TFile[]> {
        const logMap: Map<string, TFile[]> = new Map<string, TFile[]>();
        const maybeLoggingFolder = this.app.vault.getAbstractFileByPath(this.settings.loggingPath);
        if (maybeLoggingFolder instanceof TFolder) {
            maybeLoggingFolder
                .children
                .forEach((fOuter: TAbstractFile): void => {
                    if (fOuter instanceof TFolder && fOuter.children) {
                        fOuter
                            .children
                            .forEach((fInner: TAbstractFile): void => {
                                if (fInner instanceof TFile) {
                                    logMap.set(
                                        fOuter.name,
                                        (logMap.get(fOuter.name) ?? [])
                                            .concat([fInner]));
                                }
                            });
                        return;
                    }

                    if (fOuter instanceof TFile) {
                        logMap.set(
                            "",
                            (logMap.get("") ?? [])
                                .concat([fOuter])
                        )
                        return;
                    }

                    console.error(`Unknown file type found in ${fOuter}`);
                });
        }
        return logMap;
    }

    private buildTitleBar() : HTMLDivElement {
        const titleBarDiv = document.createElement("div");
        titleBarDiv.addClass("title-bar");

        const titleBarLabel = document.createElement("div");
        titleBarLabel.addClass("title-bar-label");
        titleBarLabel.ariaLabel = "Change logging path";

        const titleBarIcon = document.createElement("div");
        titleBarIcon.addClass("title-bar-icon");
        setIcon(titleBarIcon, "save");
        titleBarLabel.appendChild(titleBarIcon);

        const titleBarLabelText = document.createElement("div");
        titleBarLabelText.addClass("title-bar-label-text");

        const getLogFolderText = () => {
            const lastFolder = this.settings.loggingPath?.split("/").last();
            if (lastFolder === undefined) {
                return "click here to set log path";
            }
            return (this.settings.loggingPath === lastFolder || this.settings.loggingPath === "/") ?
                this.settings.loggingPath :
                `.../${lastFolder}`;
        }
        titleBarLabelText.setText(getLogFolderText());
        titleBarLabel.appendChild(titleBarLabelText);

        titleBarLabel.addEventListener("click", () => {
            new FolderSuggestModal(
                this.app,
                ["/"],
                async (logPath: string) => {
                    this.settings.loggingPath = logPath;
                    titleBarLabelText.setText(getLogFolderText());
                    this.updateSubmitButtonIsDisabled();
                    await this.saveSettingsCallback();
                }
            ).open();
        });

        titleBarDiv.appendChild(titleBarLabel);

        const closeButton = document.createElement("div");
        closeButton.addClass("logger-close-button");
        setIcon(closeButton, "x");
        closeButton.addEventListener("click", () => { this.close(); });
        titleBarDiv.appendChild(closeButton);

        return titleBarDiv;
    }

    private buildDateTimeDiv() {
        const dateTimeDiv = document.createElement("div");
        dateTimeDiv.addClass("datetime-section");

        const dateSection = document.createElement("div");
        dateSection.addClass("date-section");

        const dateInputDiv = document.createElement("div");

        const component = new TextComponent(dateInputDiv)
            .setValue(moment().format("YYYY-MM-DD"))
            .onChange(value => this.logFrontmatter.date = value)
            .setPlaceholder("date");
        component.onChanged();

        dateSection.appendChild(dateInputDiv);

        dateTimeDiv.appendChild(dateSection);

        const timeSection = document.createElement("div");
        timeSection.addClass("time-section");

        const timeInputDiv = document.createElement("div");

        const timeComponent = new TextComponent(timeInputDiv)
            .onChange(value => {
                this.logFrontmatter.time = value;
            })
            .setValue(moment().format(TIME_FORMAT))
            .setPlaceholder("time");
        timeComponent.onChanged();

        timeSection.appendChild(timeInputDiv);

        dateTimeDiv.appendChild(timeSection);

        return dateTimeDiv;
    }

    private buildTypeDiv() {
        const typeDiv = document.createElement("div");
        typeDiv.addClass("logger-section");

        const typeInputDiv = document.createElement("div");
        typeInputDiv.addClass("field-div");
        this.typeInput = new TextComponent(typeInputDiv);
        this.typeInput.setPlaceholder("type");
        const typeSuggest = new StringPopoverSuggest(
            this.app,
            this.typeInput.inputEl,
            (value) => {
                this.typeInput?.setValue(value);
                this.typeInput?.onChanged();
                this.rebuildFieldsDiv();
            },
            Array.from(this.logMap.keys()).filter(t => t !== ""));
        this.typeInput.onChange((value) => {
            typeSuggest.suggestFrom(value);
            this.logFrontmatter.type = value;
        });
        this.typeInput.inputEl.addEventListener("focusout", () => {
            setTimeout(() => { this.rebuildFieldsDiv(); }, 100);
        });
        typeDiv.appendChild(typeInputDiv);

        return typeDiv;
    }

    private buildField(
        key: string,
        values: Set<string>,
        isNewField: boolean,
        newFrontmatter: {[key: string]: string}
    ) {
        const fieldDiv = document.createElement("div");
        fieldDiv.addClass("logger-section");
        fieldDiv.setAttribute("field-key", key);

        const fieldInputDiv = document.createElement("div");
        fieldInputDiv.addClass("field-div");
        const fieldInput = new TextComponent(fieldInputDiv);
        fieldInput.setPlaceholder(key);

        if (key in this.logFrontmatter) {
            fieldInput.setValue(this.logFrontmatter[key]);
            newFrontmatter[key] = this.logFrontmatter[key];
        }
        fieldDiv.appendChild(fieldInputDiv);

        let warningIcon: HTMLElement | undefined = undefined;

        if (isNewField) {
            const newFieldIconsDiv = document.createElement("div");
            newFieldIconsDiv.addClass("new-field-icons");

            warningIcon = document.createElement("div");
            warningIcon.addClass("warning-icon");
            warningIcon.ariaLabel = "New fields require content to be saved!";
            setIcon(warningIcon, "alert-triangle")
            newFieldIconsDiv.appendChild(warningIcon);

            const trashIcon = document.createElement("div");
            trashIcon.addClass("trash-icon");
            setIcon(trashIcon, "x-circle");
            trashIcon.ariaLabel = "Remove new field";
            trashIcon.addEventListener("click", () => {
                this.fieldsDiv?.removeChild(fieldDiv);
                delete this.logFrontmatter[key];
            })
            newFieldIconsDiv.appendChild(trashIcon);

            fieldInputDiv.appendChild(newFieldIconsDiv);
        }

        const fieldSuggester = new StringPopoverSuggest(
            this.app,
            fieldInput.inputEl,
            (v) => {
                fieldInput.setValue(v);
                fieldInput.onChanged();
            },
            Array.from(values)
        );
        fieldInput.onChange((v) => {
            if (isNewField) {
                warningIcon && warningIcon.toggleClass("hidden", !!v);
            }
            fieldSuggester.suggestFrom(v);
            this.logFrontmatter[key] = v;
        });

        return { fieldDiv, fieldInput };
    }

    private buildFieldsDiv() {
        if (this.fieldsDiv === undefined) {
            this.fieldsDiv = document.createElement("div");
            this.fieldsDiv.addClass("additional-meta-group");
        }

        const currentType = this.typeInput?.getValue() ?? "";
        const files = this.logMap.get(currentType) ?? [];

        const fieldsMap = files.reduce((acc, file) => {
            const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? ({} as FrontMatterCache);
            Object.keys(fm).forEach(fmKey => {
                if (EXCLUDED_FIELDS.has(fmKey)) {
                    return;
                }
                if (!fm[fmKey]) {
                    return;
                }
                const value = String(fm[fmKey]).trim();
                if (!value) {
                    return;
                }
                
                acc.set(fmKey, (acc.get(fmKey) ?? new Set()).add(value));
            })
            return acc;
        }, new Map<string, Set<string>>());

        const newFrontmatter: {[id: string]: string} = {};
        [
            "time",
            "day",
            "date",
            "type"
        ].forEach(key => {
            if (key in this.logFrontmatter) {
                newFrontmatter[key] = this.logFrontmatter[key];
            }
        })

        fieldsMap.forEach((values, key) => {
            if (EXCLUDED_FIELDS.has(key)) {
                return;
            }
            const { fieldDiv } = this.buildField(key, values, false, newFrontmatter);
            this.fieldsDiv?.appendChild(fieldDiv);
        });

        this.logFrontmatter = newFrontmatter;

        return this.fieldsDiv;
    }

    private rebuildFieldsDiv() {
        if (this.fieldsDiv !== undefined) {
            this.fieldsDiv.empty();
        }
        this.buildFieldsDiv();
        this.updateSubmitButtonIsDisabled();
    }

    private buildFrontmatter() {
        const keyValueLines = Object.keys(this.logFrontmatter)
            .map(key => `"${key}": "${this.logFrontmatter[key].trim()}"`)
            .concat(["\"cssclass\": \"log-entry\""])
            .join("\n");
        return `---\n${keyValueLines}\n---`
    }

    private async saveLog() {
        // make sure the logging path exists
        if (!this.app.vault.getAbstractFileByPath(this.settings.loggingPath)) {
            await this.app.vault.createFolder(this.settings.loggingPath);
            new Notice(`Created logging folder at "${this.settings.loggingPath}"`);
        }

        // get the type folder, create it if it doesn't exist
        const logType = this.typeInput?.getValue() ?? "";
        if (!logType) {
            new Notice("Unable to log without a type");
            return;
        }
        const baseFolder = this.settings.loggingPath === "/" ? "" : (this.settings.loggingPath + "/");
        const subFolderPath = baseFolder + logType;

        const subFolder = this.app.vault.getAbstractFileByPath(subFolderPath) ?? await (async () =>
        {
            await this.app.vault.createFolder(subFolderPath);
            return this.app.vault.getAbstractFileByPath(subFolderPath);
        })();
        if (subFolder === null) {
            new Notice(`Something went wrong getting log folder "${subFolderPath}"`);
            return;
        }

        // build the file contents
        const frontmatter = this.buildFrontmatter();
        const fileContents = `${frontmatter}\n\n${this.logContent}`;

        // build the file name
        const date = this.logFrontmatter.date;
        const time = this.logFrontmatter.time;
        const timestamp = `${date}_${time.replaceAll(":", ".")}`
        const fileName = `${logType === "" ? "log" : logType}_${timestamp}`
        const extension = "md";

        // create the file
        const filePathWithoutExtension = subFolderPath + "/" + fileName;
        const filePathWithExtension = `${filePathWithoutExtension}.${extension}`
        return this.app.vault.create(filePathWithExtension, fileContents);
    }

    private async submitLog() {
        if (this.isSubmitButtonDisabled()) {
            return;
        }

        // There's a race condition when clearing the type input field and
        // clicking the submit button. If you delete what's in the type field
        // and click the submit button, the click goes through the type input
        // change takes and tries to submit without a type. Explicitly check
        // for empty type before trying to log.
        if (!this.typeInput?.getValue()) {
            return;
        }

        const file = await this.saveLog();
        if (file !== undefined) {
            this.settings.postLogAction = this.currentPostLogSelection;
            await this.saveSettingsCallback();
            const filePathWithoutExtension = file.path
                .split('.')
                .slice(0, -1)
                .join('.');
            new Notice(`Log file created at "${filePathWithoutExtension}"`);

            switch (this.currentPostLogSelection) {
                case PostLogAction.QUIETLY:
                    break;
                case PostLogAction.OPEN:
                    await this.app.workspace.getLeaf(false).openFile(file);
                    break;
                case PostLogAction.COPY:
                    await navigator.clipboard.writeText(`[[${filePathWithoutExtension}]]`);
                    break;
                default:
                    console.error(`Invalid selection: ${this.currentPostLogSelection}`);
                    break;
            }
        }

        this.close();
    }

    private isSubmitButtonDisabled(): boolean {
        return this.logChoiceContainer?.hasClass("disabled") ?? true;
    }

    private updateSubmitButtonIsDisabled() {
        const noLoggingPath = (this.settings.loggingPath ?? "") === "";
        const noType = (this.typeInput?.getValue() ?? "") === "";

        const isDisabled = noLoggingPath || noType;

        const disabledReason = (
            !isDisabled ? "" :
            noLoggingPath ? "Requires logging path" :
            noType ? "Requires type" :
            ""
        );
        if (this.submitButton) {
            this.submitButton.ariaLabel = disabledReason;
        }

        if (isDisabled) {
            this.logChoiceContainer?.addClass("disabled");
        } else {
            this.logChoiceContainer?.removeClass("disabled");
        }
    }

    private buildSubmitBarDiv() {
        const submitBarDiv = document.createElement("div");
        submitBarDiv.addClass("submit-bar");

        const logButtonContainer = document.createElement("div");
        logButtonContainer.addClass("log-button-container");

        this.logChoiceContainer = document.createElement("div");
        this.logChoiceContainer.addClass("log-choice-container");

        const CHOICES = [
            [ PostLogAction.QUIETLY, "Log quietly" ],
            [ PostLogAction.OPEN, "Log and open" ],
            [ PostLogAction.COPY, "Log and copy" ]
        ];

        this.submitButton = document.createElement("div");
        this.submitButton.addClass("log-choice");
        this.updateSubmitButtonIsDisabled();
        this.submitButton.addEventListener(
            "click",
            async () => { await this.submitLog(); });
        this.logChoiceContainer.appendChild(this.submitButton);

        // defined here, so we can show it on click of logChooser
        const logDropDown = document.createElement("div");

        const logChooser = document.createElement("div");
        logChooser.addClass("log-chooser");
        setIcon(logChooser, "chevron-down");

        document.addEventListener("click", event => {
            if (event.composedPath().includes(logChooser)) {
                if (logDropDown.hasClass("hidden")) {
                    logDropDown.removeClass("hidden");
                    logDropDown.focus();
                } else {
                    logDropDown.addClass("hidden");
                }
            } else if (!event.composedPath().includes(logDropDown)) {
                logDropDown.addClass("hidden");
            }
        });
        this.logChoiceContainer.appendChild(logChooser);

        logButtonContainer.appendChild(this.logChoiceContainer);

        // logDropDown created above logChooser, so we can show it on click
        logDropDown.addClass("log-drop-down");
        logDropDown.addClass("hidden");

        const choiceIconDivs = new Map<string, HTMLElement>();
        CHOICES.forEach(choice => choiceIconDivs.set(choice[0], document.createElement("div")));

        const getDisplayName = (choice: string) => {
            for (const ch of CHOICES) {
                if (ch[0] === choice) {
                    return ch[1];
                }
            }
            return "";
        }

        const updateTextAndIcons = () => {
            this.submitButton?.setText(getDisplayName(this.currentPostLogSelection));
            choiceIconDivs.forEach((value, key) => {
                setIcon(value, key === this.currentPostLogSelection ? "check" : "");
            })
        };

        const logDropDownChoices = document.createElement("div");
        logDropDownChoices.addClass("log-drop-down-choices");

        CHOICES.forEach(choice => {
            const logDropContainer = document.createElement("div");
            logDropContainer.addClass("log-drop-container");
            logDropContainer.addEventListener("click", () => {
                this.currentPostLogSelection = choice[0];
                logDropDown.addClass("hidden");
                updateTextAndIcons();
            });

            const logDropLabel = document.createElement("div");
            logDropLabel.addClass("log-drop-label");
            logDropLabel.setText(choice[1]);
            logDropContainer.appendChild(logDropLabel);

            const logDropIcon = choiceIconDivs.get(choice[0]);
            if (logDropIcon === undefined) {
                console.error(`undefined log drop icon for choice: ${choice}`)
                return;
            }
            logDropIcon.addClass("log-drop-icon");
            logDropContainer.appendChild(logDropIcon);

            logDropDownChoices.appendChild(logDropContainer);
        });

        logDropDown.appendChild(logDropDownChoices);

        updateTextAndIcons();

        logButtonContainer.appendChild(logDropDown);

        submitBarDiv.appendChild(logButtonContainer)

        return submitBarDiv;
    }

    private buildNewFieldInputDiv() {
        const newFieldInputContainer = document.createElement("div");
        newFieldInputContainer.addClass("field-div");

        const newFieldInputComponent = new TextComponent(newFieldInputContainer).setPlaceholder("new label ...");
        newFieldInputComponent.inputEl.addClass("new-field-input");
        const tryAddingNewField = () => {
            const value = newFieldInputComponent.inputEl.value;
            newFieldInputComponent.setValue("");
            if (value) {
                const allFields = Array.from(this.fieldsDiv?.children ?? []);
                if (allFields.some(el =>
                    el.getAttribute("field-key")?.toLowerCase() === value.toLowerCase()
                )) {
                    new Notice(`${value} already added`);
                    return;
                } else if (EXCLUDED_FIELDS.has(value.toLowerCase())) {
                    new Notice(`${value} is special and you can't use it, sorry`);
                    return;
                } else {
                    const { fieldDiv, fieldInput } = this.buildField(value, new Set(), true, {});
                    this.fieldsDiv?.appendChild(fieldDiv);
                    fieldInput.inputEl.focus();
                }
            }
        };

        const newFieldButtons = document.createElement("div");
        newFieldButtons.addClass("new-field-icons");

        const newFieldButton = document.createElement("div");
        newFieldButton.addClass("add-icon");
        newFieldButton.ariaLabel = "Add new field";
        setIcon(newFieldButton, "plus-circle");
        newFieldButton.addEventListener("click", () => {
            newFieldInputComponent.setValue("");
            newFieldInputComponent.inputEl.focus();
        });

        newFieldButtons.appendChild(newFieldButton);

        newFieldInputContainer.appendChild(newFieldButtons);

        newFieldInputComponent.inputEl.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') {
                tryAddingNewField();
            }
        })
        newFieldInputComponent.inputEl.addEventListener("focusout", () => {
            tryAddingNewField();
        })

        return newFieldInputContainer;
    }

    private buildContentDiv() {
        const contentDiv = document.createElement("div");
        contentDiv.addClass("logger-section");

        const contentInputDiv = document.createElement("div");
        contentInputDiv.addClass("content-div");
        const component = new TextAreaComponent(contentInputDiv)
            .onChange(value => this.logContent = value);
        component.setPlaceholder("content");
        component.onChanged();

        contentDiv.appendChild(contentInputDiv);

        return contentDiv;
    }

    private buildContentSection() {
        const contentSectionDiv = document.createElement("div");
        contentSectionDiv.addClass("content-section");

        contentSectionDiv.appendChild(buildSeparator(
            "metadata",
            "These fields will write to frontmatter"));
        contentSectionDiv.appendChild(this.buildDateTimeDiv());
        contentSectionDiv.appendChild(this.buildTypeDiv());
        contentSectionDiv.appendChild(this.buildFieldsDiv());
        contentSectionDiv.appendChild(this.buildNewFieldInputDiv());
        contentSectionDiv.appendChild(buildSeparator(
            "body",
            "This field will write to the document body"));

        contentSectionDiv.appendChild(this.buildContentDiv());
        return contentSectionDiv;
    }

    onOpen() {
        const accentDiv = document.createElement("div");
        accentDiv.addClass("accent-div");

        const contentDiv = document.createElement("div");
        contentDiv.addClass("accent-content")

        contentDiv.appendChild(this.buildContentSection());

        accentDiv.appendChild(this.buildTitleBar());
        accentDiv.appendChild(contentDiv);
        accentDiv.appendChild(this.buildSubmitBarDiv())

        this.contentEl.appendChild(accentDiv);
    }

    onClose() {
        this.contentEl.empty();
    }
}
