import type { CSSProperties } from "react";

/**
 * Phone landscape hand-strength chip.
 *
 * It sits under the header at the top-left, in both left-hand and right-hand
 * mode. A provably-fair tab used to take that corner and park the chip in the
 * bottom corner opposite the action column. The tab is a header icon now, so
 * the chip is back in this spot.
 */
export function landscapeHandStrengthStyle(): CSSProperties {
    return {
        position: "fixed",
        top: "calc(var(--mobile-chrome-end, 48px) + 4px)",
        left: "max(8px, env(safe-area-inset-left, 0px))",
        margin: 0,
        padding: "4px 8px",
        maxWidth: "calc(100% - 16px)",
        pointerEvents: "none",
        zIndex: 30
    };
}
