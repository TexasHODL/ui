/**
 * Desktop bottom banner (`.table-action-bar`) measurement.
 *
 * The banner hugs whatever the dock is showing (nothing, pre-actions, the action
 * row, Muck/Show), so its height changes between turns. Its measured height is
 * published as `--desktop-action-bar-h` on `.table-container`, the same way
 * `--mobile-chrome-end` publishes the top banner, so fixed chrome can sit relative
 * to it with no magic numbers.
 */
export const DESKTOP_ACTION_BAR_VAR = "--desktop-action-bar-h";

/** Gap between the hand-strength badge's bottom and the banner's top edge. */
export const HAND_STRENGTH_BANNER_GAP_PX = 3;

/** Desktop hand-strength `bottom`: banner height + gap (fallback = the old 168px). */
export const HAND_STRENGTH_DESKTOP_BOTTOM = `calc(var(${DESKTOP_ACTION_BAR_VAR}, 165px) + ${HAND_STRENGTH_BANNER_GAP_PX}px)`;

/** Start publishing the banner height; returns a disconnect function. */
export const observeDesktopActionBar = (bar: HTMLElement): (() => void) => {
    const root = bar.closest(".table-container") as HTMLElement | null;
    if (!root) return () => undefined;
    const apply = () => {
        // The bar is fixed at bottom: 0, so its height is the distance from the
        // viewport bottom to its top edge. Unrounded so the 3px gap is exact.
        root.style.setProperty(DESKTOP_ACTION_BAR_VAR, `${bar.getBoundingClientRect().height}px`);
    };
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(bar);
    return () => {
        observer?.disconnect();
        root.style.removeProperty(DESKTOP_ACTION_BAR_VAR);
    };
};