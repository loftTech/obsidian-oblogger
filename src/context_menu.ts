import { App, Menu, Modal, TFile, Setting } from "obsidian"

class RenameModal extends Modal {
    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: "What's your name?" });

        new Setting(contentEl)
            .setName("Name")
            .addText((text) =>
                text.onChange((value) => {
                    this.result = value
                }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export const showContextMenu = (app: App, e: MouseEvent, file: TFile) => {
    const menu = new Menu();

    menu.addItem(item =>
        item
            .setTitle("Open in new tab")
            .setIcon("file-plus")
            .setSection("open")
            .onClick(async () => {
                return app.workspace.openLinkText(file.path, file.path, "tab");
            })
    );

    menu.addItem((item) =>
        item
            .setTitle(`Open to the right`)
            .setIcon("separator-vertical")
            .setSection("open")
            .onClick(async () => {
                return app.workspace.openLinkText(file.path, file.path, "split");
            })
    );

    menu.addItem((item) =>
        item
            .setTitle(`Open in new window`)
            .setIcon("scan")
            .setSection("open")
            .onClick(async () => {
                return app.workspace.openLinkText(file.path, file.path, "window");
            })
    );

    menu.addItem((item) =>
        item
            .setTitle(`Rename...`)
            .setIcon("pencil")
            .setSection("edit")
            .onClick(async () => {
                new RenameModal(app, (result) => {
                    const resultWithExt = result + "." + file.extension
                    app.vault.rename(file, resultWithExt);
                }).open();
            })
    );

    menu.addItem((item) =>
        item
            .setTitle(`Make a copy`)
            .setIcon("files")
            .setSection("edit")
            .onClick( async () => {
                const copyName = file.basename.split(" ");
                let copyNumber = 1
                let newBaseName = file.basename
                if (/^\d+$/.test(copyName.last() ?? "")) {
                    copyNumber = Number(copyName.last()) ?? 1
                    newBaseName = copyName
                        .slice(0, -1)
                        .join(" ");
                }
                let copyPath = newBaseName + " " + copyNumber + "." + file.extension
                while (app.vault.getAbstractFileByPath(copyPath) !== null) {
                    copyNumber += 1
                    copyPath = newBaseName + " " + copyNumber + "." + file.extension
                }
                await app.vault.copy(file, copyPath)
            })
    );

    //todo: delete should have confirmation if selected in system
    menu.addItem((item) =>
        item
            .setTitle(`Delete`)
            .setIcon("trash")
            .setSection("delete")
            .onClick( async () => {
                await app.vault.trash(file, true);
            })
    );

    menu.showAtMouseEvent(e);
}
