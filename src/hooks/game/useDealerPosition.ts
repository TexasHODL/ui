import { useMemo } from "react";
import { useGameData } from "../../context/gameState/GameDataContext";
import { useGameUI } from "../../context/gameState/GameUIContext";

/**
 * Custom hook to get the dealer seat number from game state
 * @returns Object containing dealer seat number and loading state
 */
export const useDealerPosition = () => {
    const { gameState } = useGameData();
    const { isLoading, error } = useGameUI();

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
