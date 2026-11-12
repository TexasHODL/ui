import type { CSSProperties } from "react";

/**
 * Phone landscape hand-strength chip (ui provably-fair tab).
 *
 * The chip used to sit in the top-left, which is where the compact provably-fair
 * tab now lives. It moves to the bottom corner opposite the action column so it
 * stays off the fold / bet buttons and the slider:
 * right-hand mode keeps that column on the right, so the chip sits lower-left;
 * left-hand mode mirrors the column, so the chip sits lower-right.
 */
export function landscapeHandStrengthStyle(leftHand: boolean): CSSProperties {
    const bottom = "max(8px, env(safe-area-inset-bottom, 0px))";
    const shared: CSSProperties = {
        position: "fixed",
        top: "auto",
        bottom,
        margin: 0,
        padding: "4px 8px",
        maxWidth: "40%",
        pointerEvents: "none",
        zIndex: 30
    };
    if (leftHand) {
        return { ...shared, left: "auto", right: "max(8px, env(safe-area-inset-right, 0px))" };
    }
    return { ...shared, right: "auto", left: "max(8px, env(safe-area-inset-left, 0px))" };
}
