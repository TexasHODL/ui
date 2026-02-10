import { useGameStateContext } from "../../context/GameStateContext";
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
    // Get game state directly from Context - real-time data via WebSocket
    const { gameState, gameFormat, isLoading, error } = useGameStateContext();

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
        // Calculate the total pot from all pots
        let totalPotWei = "0";
        if (gameState.pots && Array.isArray(gameState.pots)) {
            totalPotWei = gameState.pots.reduce((sum: string, pot: string) => {
                const sumBigInt = BigInt(sum);
                const potBigInt = BigInt(pot);
                return (sumBigInt + potBigInt).toString();
            }, "0");
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
