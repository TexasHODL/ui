import { useGameStateContext } from "../../context/GameStateContext";

export const useGameResults = () => {
    const { gameState } = useGameStateContext();
    
    // Extract results from game state
    const results = gameState?.results || null;
    
    return {
        results
    };
};