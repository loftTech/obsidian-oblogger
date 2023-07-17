const MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX = 500;

// Using a minimum resolution width to determine desktop (including ipad)
// and mobile, in order to move the suggester window to the correct
// position.
export function isDesktopLikeResolution() {
    return window.screen.availWidth >= MINIMUM_DESKTOP_RESOLUTION_WIDTH_PX;
}
