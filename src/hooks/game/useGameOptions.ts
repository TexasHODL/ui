import { useMemo } from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { GameOptionsDTO } from "@block52/poker-vm-sdk";
import { GameOptionsReturn } from "../../types/index";
import { validateGameOptions } from "../../utils/gameOptionsValidation";

/**
 * Custom hook to fetch game options for a table
 * 
 * NOTE: Game options are handled through GameStateContext subscription.
 * Components call subscribeToTable(tableId) which creates a WebSocket connection with both tableAddress 
 * and playerId parameters. This hook reads the real-time game options from that context.
 * 
 * @returns Object containing game options and loading state - no defaults, returns actual values from server
 */
export const useGameOptions = (): GameOptionsReturn => {
    // Get game state directly from Context - real-time data via WebSocket
    const { gameState, gameFormat, isLoading, error } = useGameStateContext();

    // Memoize game options processing - no defaults, use actual server values
    const gameOptions = useMemo((): Required<GameOptionsDTO> | null => {
        if (!gameState) {
            return null;
        }

        if (!gameState.gameOptions) {
            console.warn("[useGameOptions] gameState exists but gameOptions is missing.", {
                gameStateKeys: Object.keys(gameState),
                gameOptions: gameState.gameOptions
            });
            return null;
        }

        try {
            const options = gameState.gameOptions;

            // Validate game options using utility function
            const validation = validateGameOptions(options);
            if (!validation.isValid) {
                console.warn("[useGameOptions] Validation failed:", validation.missingFields, {
                    rawOptions: options
                });
                return null;
            }

            // Per Commandment 7: NO defaults - use actual values from chain
            return {
                minBuyIn: options.minBuyIn!,
                maxBuyIn: options.maxBuyIn!,
                maxPlayers: options.maxPlayers!,
                minPlayers: options.minPlayers!,
                smallBlind: options.smallBlind,
                bigBlind: options.bigBlind,
                timeout: options.timeout,
                rake: options.rake,
                startingStack: options.startingStack,
                blindLevelDuration: options.blindLevelDuration,
                otherOptions: options.otherOptions || {}
            } as Required<GameOptionsDTO>;
        } catch (err) {
            console.error("Error parsing game options:", err);
            return null;
        }
    }, [gameState]);

    return {
        gameOptions,
        isLoading,
        error
    };
};
