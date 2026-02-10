/**
 * useTableBoard Hook
 *
 * Manages table board state and logic including:
 * - Community cards
 * - Pot amounts
 * - Sit & go waiting state
 */

import { useMemo } from "react";
import { useGameStateContext } from "../../../../context/GameStateContext";
import { useTableState } from "../../../../hooks/game/useTableState";
import { useVacantSeatData } from "../../../../hooks/game/useVacantSeatData";
import { isSitAndGoFormat } from "../../../../utils/gameFormatUtils";
import { UseTableBoardReturn } from "../types";

export const useTableBoard = (): UseTableBoardReturn => {
    const { gameState, gameFormat } = useGameStateContext();
    const { formattedTotalPot } = useTableState();
    const { isUserAlreadyPlaying, emptySeatIndexes } = useVacantSeatData();

    // Get community cards from game state
    const communityCards = useMemo(() => {
        if (!gameState?.communityCards) return [];
        return gameState.communityCards.filter(
            (card: string) => card && card !== "??" && card !== "XX"
        );
    }, [gameState?.communityCards]);

    // Check if we have community cards
    const hasCommunityCards = communityCards.length > 0;

    // Determine if sit & go is waiting for players
    const isSitAndGoWaitingForPlayers = useMemo(() => {
        const isSitAndGo = isSitAndGoFormat(gameFormat);
        const hasEmptySeats = emptySeatIndexes.length > 0;
        return isSitAndGo && isUserAlreadyPlaying && hasEmptySeats;
    }, [gameFormat, isUserAlreadyPlaying, emptySeatIndexes.length]);

    return {
        communityCards,
        formattedTotalPot,
        hasCommunityCards,
        isSitAndGoWaitingForPlayers
    };
};
