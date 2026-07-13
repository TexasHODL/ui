import React, { createContext, useContext, useMemo } from "react";
import type { GameStreamItem } from "../../bus/types";

/**
 * GameEventsContext — the latest committed bus item (WS Action Bus, Phase 2).
 *
 * Holds the most recently committed {@link GameStreamItem}, whose `events` array
 * carries the typed transitions derived at ingest ({@link deriveEvents}).
 * Consumers read it through `useGameEvents` (src/hooks/game/useGameEvents.ts)
 * instead of hand-rolling `useRef` snapshot diffing.
 *
 * A dedicated slice (like the other five in this folder) so only event
 * consumers re-render when a new item commits — the hot GameDataContext is
 * untouched.
 */
interface GameEventsContextValue {
    /** The latest committed stream item, or null before the first commit. */
    latestItem: GameStreamItem | null;
}

const GameEventsContext = createContext<GameEventsContextValue | null>(null);

interface GameEventsProviderProps {
    latestItem: GameStreamItem | null;
    children: React.ReactNode;
}

export const GameEventsProvider: React.FC<GameEventsProviderProps> = ({ latestItem, children }) => {
    const value = useMemo<GameEventsContextValue>(() => ({ latestItem }), [latestItem]);
    return <GameEventsContext.Provider value={value}>{children}</GameEventsContext.Provider>;
};

export const useGameEventsContext = (): GameEventsContextValue => {
    const context = useContext(GameEventsContext);
    if (!context) {
        throw new Error("useGameEventsContext must be used within a GameEventsProvider");
    }
    return context;
};
