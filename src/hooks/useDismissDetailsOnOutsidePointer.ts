import { useEffect, type RefObject } from "react";
import { isNullish } from "../utils/guards";
import { pressDismissesDetails } from "../utils/dismissDetails";

/**
 * Close an open `<details>` menu when the user presses outside it.
 *
 * Mouse, pen, and touch all fire `pointerdown` before the click, so one
 * listener covers a desktop click and a phone tap. Presses inside the menu
 * — the summary, links, and the theme toggle — are ignored, and the press
 * is not cancelled, so the control under it still runs.
 */
export function useDismissDetailsOnOutsidePointer(detailsRef: RefObject<HTMLDetailsElement | null>): void {
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            const details = detailsRef.current;
            if (isNullish(details) || !pressDismissesDetails(details, event.target)) return;
            details.open = false;
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return () => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [detailsRef]);
}
