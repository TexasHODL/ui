import React, { createContext, useContext, useMemo } from "react";
import type { ValidationError } from "../../components/playPage/TableErrorPage";

export interface PendingAction {
    gameId: string;
    actor: string;
    action: string;
    amount?: string;
    timestamp: number;
}

/**
 * GameUIContext — holds interaction-driven UI state (loading, errors, optimistic action).
 *
 * Updated on user action, mempool acks, and connection-level errors. Splitting
 * this out means components that only render game data don't re-render when
 * pendingAction or isLoading flips.
 */
interface GameUIContextValue {
    isLoading: boolean;
    error: Error | null;
    validationError: ValidationError | null;
    pendingAction: PendingAction | null;
}

const GameUIContext = createContext<GameUIContextValue | null>(null);

interface GameUIProviderProps extends GameUIContextValue {
    children: React.ReactNode;
}

export const GameUIProvider: React.FC<GameUIProviderProps> = ({
    isLoading,
    error,
    validationError,
    pendingAction,
    children
}) => {
    const value = useMemo<GameUIContextValue>(
        () => ({ isLoading, error, validationError, pendingAction }),
        [isLoading, error, validationError, pendingAction]
    );
    return <GameUIContext.Provider value={value}>{children}</GameUIContext.Provider>;
};

export const useGameUI = (): GameUIContextValue => {
    const context = useContext(GameUIContext);
    if (!context) {
        throw new Error("useGameUI must be used within a GameUIProvider");
    }
    return context;
};
