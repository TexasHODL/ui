import React, { createContext, useContext, useMemo } from "react";

/**
 * ReplayContext — holds historical-replay UI state.
 *
 * Only relevant on shareable replay links. Lives in its own context so the
 * 99% of gameplay that isn't replay doesn't pay a re-render cost for it.
 */
interface ReplayContextValue {
    isReplayMode: boolean;
    replayHandNumber: number | null;
    replayActionIndex: number | null;
}

const ReplayContext = createContext<ReplayContextValue | null>(null);

interface ReplayProviderProps extends ReplayContextValue {
    children: React.ReactNode;
}

export const ReplayProvider: React.FC<ReplayProviderProps> = ({
    isReplayMode,
    replayHandNumber,
    replayActionIndex,
    children
}) => {
    const value = useMemo<ReplayContextValue>(
        () => ({ isReplayMode, replayHandNumber, replayActionIndex }),
        [isReplayMode, replayHandNumber, replayActionIndex]
    );
    return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>;
};

export const useReplay = (): ReplayContextValue => {
    const context = useContext(ReplayContext);
    if (!context) {
        throw new Error("useReplay must be used within a ReplayProvider");
    }
    return context;
};
