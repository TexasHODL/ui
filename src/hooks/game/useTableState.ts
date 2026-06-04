import { useGameData } from "../../context/gameState/GameDataContext";
import { useGameMeta } from "../../context/gameState/GameMetaContext";
import { useGameUI } from "../../context/gameState/GameUIContext";
import { TexasHoldemRound, GameFormat } from "@block52/poker-vm-sdk";
import { TableStateReturn } from "../../types/index";
import { getGameFormat } from "../../utils/gameFormatUtils";
import { formatMicroAsUsdc } from "../../constants/currency";


const DEFAULT_TABLE_SIZE = 9;

/**
 * Custom hook to fetch and provide table state information
 * 
 * NOTE: Table state information is handled through GameStateContext subscription.
 * Components call subscribeToTable(tableId) which creates a WebSocket connection with both tableAddress 
 * and playerId parameters. This hook reads the real-time table state data from that context.
 * 
 * @returns Object containing table state properties including round, pot, size, type
 */
export const useTableState = (): TableStateReturn => {
    const { gameState } = useGameData();
    const { gameFormat } = useGameMeta();
    const { isLoading, error } = useGameUI();

    // Default values in case of error or loading
    const defaultState: TableStateReturn = {
        currentRound: TexasHoldemRound.PREFLOP,
        totalPot: "0",
        formattedTotalPot: "0.00",
        tableSize: DEFAULT_TABLE_SIZE,
        tableFormat: GameFormat.CASH,
        roundType: TexasHoldemRound.PREFLOP,
        isLoading,
        error
    };

    // If still loading or error occurred, return default values
    if (isLoading || error || !gameState) {
        return defaultState;
    }

    try {
        // Use totalPot from game state (main pot + current round bets)
        // Falls back to pots[0] (main pot) if totalPot not available
        let totalPotWei = "0";
        if (gameState.totalPot) {
            totalPotWei = gameState.totalPot;
        } else if (gameState.pots && Array.isArray(gameState.pots) && gameState.pots.length > 0) {
            totalPotWei = gameState.pots[0];
        }

        // Format total pot value to display format
        const formattedTotalPot = formatMicroAsUsdc(totalPotWei);

        // Extract the current round
        const currentRound = gameState.round || TexasHoldemRound.PREFLOP;

        // Extract table size (maximum players)
        const tableSize = gameState.gameOptions?.maxPlayers;

        // Extract table format
        const tableFormat = getGameFormat(gameFormat);

        const result: TableStateReturn = {
            currentRound,
            totalPot: totalPotWei,
            formattedTotalPot,
            tableSize,
            tableFormat,
            roundType: currentRound,
            isLoading: false,
            error: null
        };

        return result;
    } catch (err) {
        console.error("Error parsing table state:", err);
        return {
            ...defaultState,
            error: err as Error
        };
    }
};
