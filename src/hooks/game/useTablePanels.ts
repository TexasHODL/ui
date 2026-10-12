import { useCallback, useEffect, useState } from "react";

/** A single selected panel prevents history and settings from stacking. */
export const useTablePanels = (persistentHistory = false) => {
    const [panel, setPanel] = useState<"history" | "settings" | null>(null);
    // A desktop selection must not turn into an obstructing panel after rotation.
    useEffect(() => setPanel(null), [persistentHistory]);
    const closeHistory = useCallback(() => setPanel(null), []);
    const onCloseSideBar = useCallback(
        () => setPanel(current => current === "history" ? null : "history"),
        []
    );
    const onToggleSettings = useCallback(() => setPanel(current => (current === "settings" ? null : "settings")), []);
    return {
        openSidebar: persistentHistory ? panel !== "settings" : panel === "history",
        expandedHistory: persistentHistory && panel === "history",
        openSettings: panel === "settings",
        onCloseSideBar,
        closeHistory,
        onToggleSettings
    };
};
