import { useEffect, type RefObject } from "react";
import { isNullish } from "@block52/ui-sdk/helpers";
import { pressDismissesDetails } from "../utils/dismissDetails";

/**
 * Close an open `<details>` menu when the user presses outside it or presses Escape.
 *
 * Mouse, pen, and touch all fire `pointerdown` before the click, so one
 * listener covers a desktop click and a phone tap. Presses inside the menu
 * — the summary, links, and nested controls such as a network dropdown —
 * are ignored, and the press is not cancelled, so the control under it still runs.
 *
 * Escape leaves the menu alone when a dialog is already on top (for example
 * the Invite QR modal), so the dialog can close first.
 */
export function useDismissDetailsOnOutsidePointer(detailsRef: RefObject<HTMLDetailsElement | null>): void {
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            const details = detailsRef.current;
            if (isNullish(details) || !pressDismissesDetails(details, event.target)) return;
            details.open = false;
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const details = detailsRef.current;
            if (isNullish(details) || !details.open) return;
            if (document.querySelector('[role="dialog"]')) return;
            details.open = false;
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [detailsRef]);
}
