export function buildSeparator(
    className: string,
    text: string,
    tooltipText: string
): HTMLDivElement {
    const separatorContainer = document.createElement(("div"));
    separatorContainer.addClass("separator-container");
    separatorContainer.addClass(className);

    // metadata separator div
    const metadataSeparatorDiv = document.createElement("div");
    metadataSeparatorDiv.addClass("separator");
    metadataSeparatorDiv.setText(text);
    metadataSeparatorDiv.ariaLabel = tooltipText;

    separatorContainer.appendChild(metadataSeparatorDiv);

    return separatorContainer;
}
