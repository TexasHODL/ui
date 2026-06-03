import React, { createContext, useContext, useMemo } from "react";
import type { GameFormat, GameVariant } from "@block52/poker-vm-sdk";

/**
 * GameMetaContext — holds format and variant.
 *
 * Set on table mount, never changes mid-hand. Splitting this out means
 * format/variant consumers don't re-render on every WS state update.
 */
interface GameMetaContextValue {
    gameFormat: GameFormat | undefined;
    gameVariant: GameVariant | undefined;
}

const GameMetaContext = createContext<GameMetaContextValue | null>(null);

interface GameMetaProviderProps {
    gameFormat: GameFormat | undefined;
    gameVariant: GameVariant | undefined;
    children: React.ReactNode;
}

export const GameMetaProvider: React.FC<GameMetaProviderProps> = ({ gameFormat, gameVariant, children }) => {
    const value = useMemo<GameMetaContextValue>(
        () => ({ gameFormat, gameVariant }),
        [gameFormat, gameVariant]
    );
    return <GameMetaContext.Provider value={value}>{children}</GameMetaContext.Provider>;
};

export const useGameMeta = (): GameMetaContextValue => {
    const context = useContext(GameMetaContext);
    if (!context) {
        throw new Error("useGameMeta must be used within a GameMetaProvider");
    }
    return context;
};
