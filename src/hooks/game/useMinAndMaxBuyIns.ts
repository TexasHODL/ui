import { useGameStateContext } from "../../context/GameStateContext";
import { MinAndMaxBuyInsReturn } from "../../types/index";

/**
 * Custom hook to fetch min and max buy-in values for a table
 *
 * NOTE: Min and max buy-in values are handled through GameStateContext subscription.
 * Components call subscribeToTable(tableId) which creates a WebSocket connection with both tableAddress
 * and playerId parameters. This hook reads the real-time buy-in data from that context.
 *
 * Per Commandment 7 (NO Defaults): Returns values directly from chain without any
 * conversion heuristics or default values. If data is missing, returns undefined.
 *
 * @returns Object containing min/max buy-in values in USDC micro-units (6 decimals)
 */
export const useMinAndMaxBuyIns = (): MinAndMaxBuyInsReturn => {
    // Get game state directly from Context - real-time data via WebSocket
    const { gameState, isLoading, error } = useGameStateContext();

    // Per Commandment 7: NO defaults - return undefined if data not available
    if (isLoading || error || !gameState?.gameOptions) {
        return {
            minBuyIn: undefined,
            maxBuyIn: undefined,
            isLoading,
            error
        };
    }

    // Pass through values directly from chain - no conversion heuristics
    return {
        minBuyIn: gameState.gameOptions.minBuyIn,
        maxBuyIn: gameState.gameOptions.maxBuyIn,
        isLoading: false,
        error: null
    };
};
