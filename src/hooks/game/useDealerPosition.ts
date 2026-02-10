import { useGameStateContext } from "../../context/GameStateContext";

/**
 * Custom hook to get the dealer seat number from game state
 * @returns Object containing dealer seat number and loading state
 */
export const useDealerPosition = () => {
    // Get game state directly from Context
    const { gameState, isLoading, error } = useGameStateContext();

    // Return dealer seat number from game state
    return {
        dealerSeat: gameState?.dealer || null,
        isLoading,
        error
    };
};
