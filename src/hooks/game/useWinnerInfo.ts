import { useGameStateContext } from "../../context/GameStateContext";
import { TexasHoldemStateDTO, WinnerDTO } from "@block52/poker-vm-sdk";
import { formatUSDCToSimpleDollars } from "../../utils/numberUtils";
import { WinnerInfo, WinnerInfoReturn } from "../../types/index";
import { hasElements } from "../../utils/guards";

/**
 * Extract winner information from game state
 * @param gameData The parsed game data
 * @returns Array of winner information or null if no winners
 */
function getWinnerInfo(gameData: TexasHoldemStateDTO) {
    if (!gameData) return null;

    // Check for explicit winners array in the game data
    if (hasElements(gameData.winners)) {
        return gameData.winners.map((winner: WinnerDTO) => {
            // The engine stamps the winner's seat at win time (SDK 1.2.15+), so it
            // survives the winner leaving the table. Do NOT resolve it from
            // players[] — that yields seat 0 once the winner is gone (#2378).
            //
            // winType is derived from whether cards were revealed: a showdown win
            // carries the winning hand; an uncontested win (everyone folded) does
            // not. Fixes the previously-hardcoded "Showdown" label on fold wins.
            return {
                seat: winner.seat,
                address: winner.address,
                amount: winner.amount.toString(),
                formattedAmount: formatUSDCToSimpleDollars(winner.amount.toString()),
                winType: hasElements(winner.cards) ? "showdown" : "uncontested",
                description: winner.description,
                handName: winner.name,
                cards: winner.cards
            };
        });
    }

    // No winners yet
    return null;
}

/**
 * Custom hook to fetch and provide winner information
 * @param tableId The ID of the table (not used - Context manages subscription)
 * @returns Object containing winner information
 */
export const useWinnerInfo = (): WinnerInfoReturn => {
    // Get game state directly from Context - no additional WebSocket connections
    const { gameState, isLoading, error } = useGameStateContext();

    // Default values in case of error or loading
    const defaultState: WinnerInfoReturn = {
        winnerInfo: null as WinnerInfo[] | null,
        error
    };

    // If still loading or error occurred, return default values
    if (isLoading || error || !gameState) {
        return defaultState;
    }

    try {
        // Process winner information
        const winners = getWinnerInfo(gameState);
        const result: WinnerInfoReturn = {
            winnerInfo: winners,
            error: null
        };

        return result;
    } catch (err) {
        console.error("Error parsing winner information:", err);
        return {
            ...defaultState,
        };
    }
};
