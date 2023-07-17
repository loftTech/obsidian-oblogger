import { Plugin } from "obsidian";
import { ObloggerView, VIEW_TYPE_OBLOGGER } from "./oblogger_view";
import { ObloggerSettings, DEFAULT_SETTINGS } from "./settings";
import { LoggerModal } from "./logger_modal";

import "../css/logger.css";
import "../css/pop_up.css";
import "../css/pane_tab_header.css";
import "../css/pane_tab_content.css";

export default class Oblogger extends Plugin {
    settings: ObloggerSettings;

    getObloggerView(): ObloggerView | undefined {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_OBLOGGER)) {
            const view = leaf && leaf.view;
            if (view instanceof ObloggerView) {
                return view;
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        console.debug("Saving settings...");
        await this.saveData(this.settings);
        this.getObloggerView()?.requestRender();
    }

    runLogger() {
        new LoggerModal(
            this.app,
            this.settings,
            () => { return this.saveSettings() }
        ).open();
    }

    async onload() {
        console.log("oblogger loading");
        this.registerEvent(
            this.app.metadataCache.on("changed", async () => {
                await this.getObloggerView()?.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("create", async () => {
                await this.getObloggerView()?.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("modify", async () => {
                await this.getObloggerView()?.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("rename", async () => {
                await this.getObloggerView()?.requestRender();
            })
        );

        this.registerEvent(
            this.app.vault.on("delete", async () => {
                await this.getObloggerView()?.requestRender();
            })
        );

        this.registerView(
            VIEW_TYPE_OBLOGGER,
            (leaf) => new ObloggerView(
                leaf,
                async () => {
                    this.runLogger();
                },
                this.settings,
                async () => { return await this.saveSettings() }));

        this.addCommand({
            id: "open-oblogger-log-logger",
            name: "Oblogger Log Logger...",
            callback: () => {
                this.runLogger();
            },
        });

        this.addCommand({
            id: "open-oblogger-side-panel",
            name: "Open Oblogger...",
            callback: () => {
                this.activateSidePane();
            },
        });

        await this.loadSettings();

        this.registerInterval(window.setTimeout(() => {
            this.activateSidePane();
        }, 100));
    }

    onunload() {
        console.debug("oblogger unloading");
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_OBLOGGER);
    }

    async activateSidePane() {
        if (this.app.workspace.getActiveViewOfType(ObloggerView)) {
            return;
        }
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_OBLOGGER);

        await this.app.workspace.getLeftLeaf(false).setViewState({
            type: VIEW_TYPE_OBLOGGER,
            active: true
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE_OBLOGGER)[0]
        );
    }
}
