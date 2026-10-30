import { useCallback, useEffect, useRef, useState } from "react";

type PanelState = "closed" | "dock" | "history" | "settings" | "blinds";

/** A single selected panel prevents history, settings and blinds (PC) from stacking. */
export const useTablePanels = (persistentHistory = false) => {
    const [panel, setPanel] = useState<PanelState>(persistentHistory ? "dock" : "closed");
    // A desktop selection must not turn into an obstructing panel after rotation.
    useEffect(() => setPanel(persistentHistory ? "dock" : "closed"), [persistentHistory]);
    // What closing Settings/Blinds returns to: the small corner feed only if it was
    // showing when the side panel opened, otherwise nothing. Never the expanded History.
    const returnTo = useRef<PanelState>("closed");
    const isSidePanel = (state: PanelState) => state === "settings" || state === "blinds";
    const openSide = (current: PanelState, next: PanelState): PanelState => {
        if (!isSidePanel(current)) returnTo.current = persistentHistory && current === "dock" ? "dock" : "closed";
        return next;
    };
    const closeHistory = useCallback(() => {
        setPanel(current => (current === "settings" || current === "blinds" ? current : "closed"));
    }, []);
    const expandHistory = useCallback(() => setPanel("history"), []);
    const onCloseSideBar = useCallback(() => {
        setPanel(current => {
            if (persistentHistory) {
                if (current === "closed" || current === "settings" || current === "blinds") return "dock";
                return "closed";
            }
            return current === "history" ? "closed" : "history";
        });
    }, [persistentHistory]);
    const onToggleSettings = useCallback(() => {
        setPanel(current => (current === "settings" ? returnTo.current : openSide(current, "settings")));
    }, [persistentHistory]);
    const openBlinds = useCallback(() => setPanel(current => openSide(current, "blinds")), [persistentHistory]);
    const closeBlinds = useCallback(() => {
        setPanel(current => (current === "blinds" ? returnTo.current : current));
    }, []);
    const historyVisible = panel === "history" || (persistentHistory && panel === "dock");
    return {
        openSidebar: historyVisible,
        expandedHistory: persistentHistory && panel === "history",
        openSettings: panel === "settings",
        blindsOpen: panel === "blinds",
        onCloseSideBar,
        closeHistory,
        expandHistory,
        onToggleSettings,
        openBlinds,
        closeBlinds
    };
};
