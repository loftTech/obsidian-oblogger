import { ContainerCallbacks } from "../container_callbacks";
import { ObloggerSettings, OtcGroupType } from "../../settings";
import { App, FrontMatterCache, TFile } from "obsidian";
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
            isPinned
        );
    }

    private getCondensedValue(value: unknown, valueType: string): string {
        switch (valueType) {
            case "tags":
                if (Array.isArray(value)) {
                    return (value as Array<string>).map(tag => `#${tag}`).join(", ");
                }
                return `#${value as string}`;
            case "text":
            default:
                return (value as string) ?? "";
        }
    }

    protected buildFileStructure(excludedFolders: string[]): void {

        const filesWithFrontmatter = this.app.vault
            .getMarkdownFiles()
            .filter(file => {
                return !this.isFileExcluded(file, excludedFolders);
            }).map(file => {
                const maybeFrontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                const value = maybeFrontmatter ? maybeFrontmatter[this.groupName] : undefined;
                return {
                    file: file,
                    value: value
                };
            }).filter(fileWithValue => {
                return !!fileWithValue.value;
            });

        // // This function exists at run-time
        // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // // @ts-ignore
        // const propertyType = this.app.metadataCache.getAllPropertyInfos()[this.groupName].type;
        //
        // const values = this.app.metadataCache
        //     // This function exists at run-time
        //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //     // @ts-ignore
        //     .getFrontmatterPropertyValuesForKey(this.groupName)
        //     .map((value: unknown) => this.getCondensedValue(value, propertyType));

        type ValueMap = {[key: string]: TFile[]};
        const values = filesWithFrontmatter.reduce((acc: ValueMap, cur) => {
            if (!Object.keys(acc).contains(cur.value)) {
                acc[cur.value.toString()] = [];
            }
            acc[cur.value.toString()].push(cur.file);
            return acc;
        }, {});


        console.log(`values for ${this.groupName}: ${values}`)
        Object.entries(values).forEach((mapping) => {
            const value = mapping[0];
            const files = mapping[1];
            if (files.length === 0) {
                // nothing to do
                return;
            }
            // add as a folder containing the files
            files.forEach(fileWithFrontmatter => {
                this.addFileToFolder(
                    fileWithFrontmatter,
                    value,
                    "/"
                )
            });
        });
    }

    protected getTextIcon(): string {
        return "";
    }

    protected getTextIconTooltip(): string {
        return "";
    }

    protected getTitleText(): string {
        return this.groupName;
    }

    protected getTitleTooltip(): string {
        return "";
    }

    protected wouldBeRendered(state: FileState): boolean {
        // if we don't have frontmatter, then it's not going to be rendered
        if (!state.maybeMetadata?.frontmatter) {
            return false;
        }
        return Object.keys(state.maybeMetadata?.frontmatter).contains(this.groupName);
    }
}
