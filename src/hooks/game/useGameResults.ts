import { useMemo } from "react";
import { useGameStateContext } from "../../context/GameStateContext";

export const useGameResults = () => {
    const { gameState } = useGameStateContext();

    const results = gameState?.results || null;

    return useMemo(() => ({ results }), [results]);
};