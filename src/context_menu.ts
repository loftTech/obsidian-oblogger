import {Menu, TFile} from "obsidian"

export const showContextMenu = (e: MouseEvent, file: TFile) => {
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

    menu.showAtMouseEvent(e);
}
