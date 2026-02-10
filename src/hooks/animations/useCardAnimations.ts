import { useState, useEffect } from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { CardAnimationsReturn } from "../../types/index";

/**
 * Custom hook to handle card animations
 * @param _tableId The ID of the table (not used - Context manages subscription)
 * @returns Object containing animation state for cards
 */
export const useCardAnimations = (_tableId?: string): CardAnimationsReturn => {
    const [flipped1, setFlipped1] = useState(false);
    const [flipped2, setFlipped2] = useState(false);
    const [flipped3, setFlipped3] = useState(false);

    // Get game state directly from Context - no additional WebSocket connections
    const { gameState } = useGameStateContext();

    // Derived state to replace showThreeCards
    const communityCards = gameState?.communityCards || [];
    const showThreeCards = communityCards.length >= 3;

    // Function to animate card flipping
    const threeCardsTable = () => {
        setTimeout(() => {
            setFlipped1(true);
        }, 1000);
        setTimeout(() => {
            setFlipped2(true);
        }, 1100);
        setTimeout(() => {
            setFlipped3(true);
        }, 1200);
    };

    // Effect to trigger animations when cards should be shown
    useEffect(() => {
        if (showThreeCards) {
            threeCardsTable();
        }
    }, [showThreeCards]);

    return {
        flipped1,
        flipped2,
        flipped3,
        showThreeCards
    };
};
