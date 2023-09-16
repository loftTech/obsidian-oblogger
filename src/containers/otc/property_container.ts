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

    protected buildFileStructure(excludedFolders: string[]): void {
        // This function exists at run-time
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const values = this.app.metadataCache.getFrontmatterPropertyValuesForKey(this.groupName)

        // We explicitly filter out undefined frontmatter as a final step,
        // but the linter and ts don't understand that. Maybe there's a
        // cleaner way to do this that doesn't involve disabling the
        // linter?
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const filesWithFrontmatter: {
            frontmatter: FrontMatterCache;
            file: TFile
        }[] = this.app.vault
            .getMarkdownFiles()
            .filter(file => {
                return !this.isFileExcluded(file, excludedFolders);
            }).map(file => {
                return {
                    file: file,
                    frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter
                };
            }).filter(fileWithMetadata => {
                return !!(fileWithMetadata.frontmatter);
            });

        values.forEach((value: string) => {
            const filesWithValue = filesWithFrontmatter
                .filter(fileWithFrontmatter => {
                    const maybeValue = fileWithFrontmatter.frontmatter[this.groupName];
                    return maybeValue?.toString().toLowerCase() === value.toLowerCase();
                });
            if (filesWithValue.length === 0) {
                // nothing to do
                return;
            }
            if (filesWithValue.length === 1) {
                // add as a file
                const fileWithFrontmatter = filesWithValue.first();
                fileWithFrontmatter && this.addFileToFolder(
                    fileWithFrontmatter.file,
                    "",
                    "/"
                )
                return;
            }
            // add as a folder containing the files
            filesWithValue.forEach(fileWithFrontmatter => {
                this.addFileToFolder(
                    fileWithFrontmatter.file,
                    "",
                    value
                )
            });
        });

        // todo: use this call when creating the container
        // this.app.metadataCache.getAllPropertyInfos()

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
