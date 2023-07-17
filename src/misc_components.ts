export function buildSeparator(
    className: string,
    text: string,
    tooltipText: string
): HTMLDivElement {
    const separatorContainer = document.createElement(("div"));
    separatorContainer.addClass("separator-container");
    separatorContainer.addClass(className);

    const separatorBorderLineLeftDiv = document.createElement("div");
    separatorBorderLineLeftDiv.addClass("separator-border-line-left");

    // metadata separator div
    const metadataSeparatorDiv = document.createElement("div");
    metadataSeparatorDiv.addClass("separator");
    metadataSeparatorDiv.setText(text);
    metadataSeparatorDiv.ariaLabel = tooltipText;

    const separatorBorderLineRightDiv = document.createElement("div");
    separatorBorderLineRightDiv.addClass("separator-border-line-right");

    separatorContainer.appendChild(separatorBorderLineLeftDiv);
    separatorContainer.appendChild(metadataSeparatorDiv);
    separatorContainer.appendChild(separatorBorderLineRightDiv);

    return separatorContainer;
}
