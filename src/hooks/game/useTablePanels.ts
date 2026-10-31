import { useCallback, useEffect, useRef, useState } from "react";

type PanelState = "closed" | "dock" | "history" | "settings" | "blinds";

/** The PC side panels and the header buttons that toggle them (their own clicks are not "outside"). */
const PANEL_SELECTOR = "#table-history-panel, #table-settings-panel, #table-blinds-panel";
const TOGGLE_SELECTOR = "[aria-controls=\"table-history-panel\"], [aria-controls=\"table-settings-panel\"], [aria-controls=\"table-blinds-panel\"]";
/** Controls whose click is swallowed when it only dismisses a panel (never fold/bet by accident). */
const INTERACTIVE_SELECTOR = "button, a[href], input, select, textarea, label, [role=\"button\"], [role=\"slider\"], [role=\"menuitem\"], [tabindex]:not([tabindex=\"-1\"])";

/**
 * A single selected panel prevents history, settings and blinds (PC) from stacking.
 *
 * PC (persistentHistory): every panel starts closed and behaves like a modal: the
 * header buttons toggle/swap them, and the X, an outside click or re-pressing the button
 * of the open one leaves nothing open (closing one never reopens another).
 * An outside click on a non-interactive area closes and passes through; on an
 * interactive control (a button, the bet slider...) it only closes, so dismissing
 * a panel can never fold, bet or navigate by accident.
 */
export const useTablePanels = (persistentHistory = false) => {
    const [panel, setPanel] = useState<PanelState>("closed");
    // A desktop selection must not turn into an obstructing panel after rotation.
    useEffect(() => setPanel("closed"), [persistentHistory]);
    const closeHistory = useCallback(() => {
        setPanel(current => (current === "settings" || current === "blinds" ? current : "closed"));
    }, []);
    const expandHistory = useCallback(() => setPanel("history"), []);
    const closeAll = useCallback(() => setPanel("closed"), []);
    const onCloseSideBar = useCallback(() => {
        setPanel(current => {
            if (persistentHistory) return current === "dock" || current === "history" ? "closed" : "dock";
            return current === "history" ? "closed" : "history";
        });
    }, [persistentHistory]);
    const onToggleSettings = useCallback(() => setPanel(current => (current === "settings" ? "closed" : "settings")), []);
    const openBlinds = useCallback(() => setPanel("blinds"), []);
    const closeBlinds = useCallback(() => setPanel(current => (current === "blinds" ? "closed" : current)), []);

    // PC: a click outside the open panel closes it.
    const swallowClick = useRef<((event: MouseEvent) => void) | null>(null);
    useEffect(() => {
        if (!persistentHistory || panel === "closed") return;
        const clearSwallow = () => {
            if (swallowClick.current) document.removeEventListener("click", swallowClick.current, true);
            swallowClick.current = null;
        };
        const onPointer = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element) || target.closest(PANEL_SELECTOR) || target.closest(TOGGLE_SELECTOR)) return;
            if (target.closest(INTERACTIVE_SELECTOR)) {
                clearSwallow();
                const swallow = (click: MouseEvent) => {
                    click.preventDefault();
                    click.stopPropagation();
                    clearSwallow();
                };
                swallowClick.current = swallow;
                document.addEventListener("click", swallow, true);
                // A drag that never becomes a click must not eat a later one.
                window.setTimeout(clearSwallow, 600);
            }
            setPanel("closed");
        };
        document.addEventListener("pointerdown", onPointer, true);
        return () => document.removeEventListener("pointerdown", onPointer, true);
    }, [persistentHistory, panel]);

    const historyVisible = panel === "history" || (persistentHistory && panel === "dock");
    return {
        openSidebar: historyVisible,
        expandedHistory: persistentHistory && panel === "history",
        openSettings: panel === "settings",
        blindsOpen: panel === "blinds",
        onCloseSideBar,
        closeHistory,
        closeAll,
        expandHistory,
        onToggleSettings,
        openBlinds,
        closeBlinds
    };
};