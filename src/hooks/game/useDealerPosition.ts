import { useMemo } from "react";
import { useGameStateContext } from "../../context/GameStateContext";

/**
 * Custom hook to get the dealer seat number from game state
 * @returns Object containing dealer seat number and loading state
 */
export const useDealerPosition = () => {
    const { gameState, isLoading, error } = useGameStateContext();

    const dealerSeat = gameState?.dealer || null;

    return useMemo(
        () => ({
            dealerSeat,
            isLoading,
            error
        }),
        [dealerSeat, isLoading, error]
    );
};
