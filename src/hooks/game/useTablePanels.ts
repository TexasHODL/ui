import { useCallback, useEffect, useState } from "react";

type PanelState = "closed" | "dock" | "history" | "settings";

/** A single selected panel prevents history and settings from stacking. */
export const useTablePanels = (persistentHistory = false) => {
    const [panel, setPanel] = useState<PanelState>(persistentHistory ? "dock" : "closed");
    // A desktop selection must not turn into an obstructing panel after rotation.
    useEffect(() => setPanel(persistentHistory ? "dock" : "closed"), [persistentHistory]);
    const closeHistory = useCallback(() => {
        setPanel(current => (current === "settings" ? current : "closed"));
    }, []);
    const expandHistory = useCallback(() => setPanel("history"), []);
    const onCloseSideBar = useCallback(() => {
        setPanel(current => {
            if (persistentHistory) {
                if (current === "closed" || current === "settings") return "dock";
                return "closed";
            }
            return current === "history" ? "closed" : "history";
        });
    }, [persistentHistory]);
    const onToggleSettings = useCallback(() => {
        setPanel(current => (current === "settings" ? (persistentHistory ? "dock" : "closed") : "settings"));
    }, [persistentHistory]);
    const historyVisible = panel === "history" || (persistentHistory && panel === "dock");
    return {
        openSidebar: historyVisible,
        expandedHistory: persistentHistory && panel === "history",
        openSettings: panel === "settings",
        onCloseSideBar,
        closeHistory,
        expandHistory,
        onToggleSettings
    };
};
