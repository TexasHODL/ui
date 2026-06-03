import React, { createContext, useContext, useMemo } from "react";
import type { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";

/**
 * GameDataContext — holds the live TexasHoldemStateDTO only.
 *
 * Updated on every WebSocket message. Hooks that only need game state
 * (player chips, board cards, turn index, etc.) should consume this
 * instead of the omnibus useGameStateContext().
 */
interface GameDataContextValue {
    gameState: TexasHoldemStateDTO | undefined;
}

const GameDataContext = createContext<GameDataContextValue | null>(null);

interface GameDataProviderProps {
    gameState: TexasHoldemStateDTO | undefined;
    children: React.ReactNode;
}

export const GameDataProvider: React.FC<GameDataProviderProps> = ({ gameState, children }) => {
    const value = useMemo<GameDataContextValue>(() => ({ gameState }), [gameState]);
    return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
};

export const useGameData = (): GameDataContextValue => {
    const context = useContext(GameDataContext);
    if (!context) {
        throw new Error("useGameData must be used within a GameDataProvider");
    }
    return context;
};
