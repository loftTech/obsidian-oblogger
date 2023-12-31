import { ContainerCallbacks } from "../container_callbacks";
import { ContainerSortMethod, ObloggerSettings, OtcGroupType } from "../../settings";
import { App, Menu, TFile } from "obsidian";
import { OtcContainer } from "./otc_container";
import { FileState } from "../../constants";

export class PropertyContainer extends OtcContainer {
    constructor(
        app: App,
        settings: ObloggerSettings,
        callbacks: ContainerCallbacks,
        propertyName: string,
        isPinned: boolean
    ) {
        super(
            app,
            settings,
            callbacks,
            OtcGroupType.PROPERTY_GROUP,
            propertyName, // groupName
            isPinned,
            false // showStatusIcon
        );
    }

    protected getPillClickHandler(): ((e: MouseEvent) => void) | undefined {
        return (e: MouseEvent) => {
            const menu = new Menu();

            this.addSortOptionsToMenu(
                menu,
                [ ContainerSortMethod.ALPHABETICAL ]
            );

            menu.showAtMouseEvent(e);
        }
    }

    private getAllValues(value: string, valueType: string): string[] {
        switch (valueType) {
            case "tags":
            case "multitext":
                if (Array.isArray(value)) {
                    return value.map(v => v.trim());
                }
                return value.split(",").map(v => v.trim());
            case "checkbox":
                return [value ? "checked" : "unchecked"];
            case "datetime": {
                const date = new Date(value);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hour = date.getHours().toString().padStart(2, '0');
                const minute = date.getMinutes().toString().padStart(2, '0');
                return [`${year}-${month}-${day}, ${hour}:${minute}`];
            } case "text":
            default:
                return [(value.toString() ?? "").trim()];
        }
    }

    protected buildFileStructure(excludedFolders: string[]): void {
        const filesWithFrontmatter = this.app.vault
            .getMarkdownFiles()
            .filter(file => {
                return !this.isFileExcluded(file, excludedFolders);
            }).map(file => {
                const maybeFrontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                const value = maybeFrontmatter ? maybeFrontmatter[this.groupName] : null;
                return {
                    file: file,
                    value: value
                };
            }).filter(fileWithValue => {
                return fileWithValue.value !== null && fileWithValue.value !== undefined;
            });

        // This function exists at run-time
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const propertyType = this.app.metadataCache.getAllPropertyInfos()[this.groupName]?.type;

        type ValueMap = {[key: string]: TFile[]};
        const values = filesWithFrontmatter.reduce((acc: ValueMap, cur) => {
            this.getAllValues(cur.value, propertyType).forEach((value) => {
                if (!Object.keys(acc).contains(value)) {
                    acc[value.toString().trim()] = [];
                }
                acc[value.toString().trim()].push(cur.file);
            });
            return acc;
        }, {});

        const ascending = this.getGroupSettings()?.sortAscending ?? true;
        const modifier = ascending ? 1 : -1;
        const sortMethod = this.getGroupSettings()?.sortMethod ?? ContainerSortMethod.ALPHABETICAL;
        const fileSortingFn = this.getFileSortingFn(sortMethod);

        Object.entries(values)
            .sort(([valueA], [valueB]) => {
                return modifier * (valueA < valueB ? -1 : valueA > valueB ? 1 : 0);
            })
            .forEach(([value, files]) => {
                if (files.length === 0) {
                    // nothing to do
                    return;
                }
                // add as a folder containing the files
                files
                    .sort((fileA, fileB) => {
                        const bookmarkSorting = this.sortFilesByBookmark(fileA, fileB);
                        if (bookmarkSorting != 0) {
                            return bookmarkSorting;
                        }
                        return (ascending ? 1 : -1) * fileSortingFn(fileA, fileB);
                    })
                    .forEach(fileWithFrontmatter => {
                        this.addFileToFolder(
                            fileWithFrontmatter,
                            value,
                            "/");
                    });
            });
    }

    protected getTextIcon(): string {
        return "text";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getTitleText(): string {
        return this.groupName;
    }

    protected getTitleTooltip(): string {
        return "Property group";
    }

    protected wouldBeRendered(state: FileState): boolean {
        // if we don't have frontmatter, then it's not going to be rendered
        if (!state.maybeMetadata?.frontmatter) {
            return false;
        }
        return Object.keys(state.maybeMetadata?.frontmatter).contains(this.groupName);
    }
}
