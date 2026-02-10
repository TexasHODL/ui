import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { useNetwork } from "../../context/NetworkContext";
import { useShowingCardsByAddress } from "./useShowingCardsByAddress";
import { PlayerStatus, PlayerDTO } from "@block52/poker-vm-sdk";

/**
 * Equity result for a single hand
 */
interface EquityResult {
    hand_index: number;
    hand: string[];
    wins: number;
    ties: number;
    losses: number;
    equity: string;
    tie_equity: string;
    total: string;
}

/**
 * Return type for useAllInEquity hook
 */
interface AllInEquityResult {
    /** Map of seat index to equity percentage (0-100) */
    equities: Map<number, number>;
    /** Whether equity should be shown (all players all-in with visible cards) */
    shouldShow: boolean;
    /** Whether equity calculation is in progress */
    isLoading: boolean;
    /** Error if equity calculation failed */
    error: Error | null;
}

/**
 * Hook to calculate and display equity when all remaining players are all-in
 *
 * Conditions for showing equity:
 * 1. 2+ players remain (not folded)
 * 2. ALL remaining players are all-in
 * 3. Cards are visible (showdown or players showing)
 * 4. Round is not yet over (no winner declared)
 */
export function useAllInEquity(): AllInEquityResult {
    const { gameState } = useGameStateContext();
    const { currentNetwork } = useNetwork();
    const { showingPlayers } = useShowingCardsByAddress();

    const [equities, setEquities] = useState<Map<number, number>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Track last calculated state to avoid duplicate calls
    const lastCalculationRef = useRef<string>("");

    /**
     * Get active (non-folded) players
     */
    const activePlayers = useMemo(() => {
        if (!gameState?.players) return [];
        return gameState.players.filter(
            (p: PlayerDTO) => p.status !== PlayerStatus.FOLDED
        );
    }, [gameState?.players]);

    /**
     * Check if all active players are all-in
     */
    const allPlayersAllIn = useMemo(() => {
        if (activePlayers.length < 2) return false;
        return activePlayers.every(
            (p: PlayerDTO) => p.status === PlayerStatus.ALL_IN
        );
    }, [activePlayers]);

    /**
     * Get players with visible cards (from showingPlayers or game state)
     */
    const playersWithVisibleCards = useMemo(() => {
        if (!gameState?.players) return [];

        const visible: Array<{ seat: number; cards: string[] }> = [];

        for (const player of activePlayers) {
            // Check if player is showing cards
            const showingPlayer = showingPlayers?.find((sp: { seat: number; holeCards?: string[] }) => sp.seat === player.seat);
            if (showingPlayer?.holeCards && showingPlayer.holeCards.length === 2) {
                visible.push({ seat: player.seat, cards: showingPlayer.holeCards });
                continue;
            }

            // Check if player's hole cards are visible in game state
            if (player.holeCards && player.holeCards.length === 2) {
                // Only count if cards are actual cards, not hidden/masked
                const hasRealCards = player.holeCards.every(
                    (c: string) => c && c !== "??" && c !== "XX" && c.length >= 2
                );
                if (hasRealCards) {
                    visible.push({ seat: player.seat, cards: player.holeCards });
                }
            }
        }

        return visible;
    }, [activePlayers, showingPlayers, gameState?.players]);

    /**
     * Determine if we should show equity
     * - All active players are all-in
     * - All active players have visible cards
     * - We have 2+ players
     */
    const shouldShow = useMemo(() => {
        if (!allPlayersAllIn) return false;
        if (activePlayers.length < 2) return false;

        // Check if all active players have visible cards
        const allHaveVisibleCards = activePlayers.every(
            (p: PlayerDTO) => playersWithVisibleCards.some(v => v.seat === p.seat)
        );

        return allHaveVisibleCards;
    }, [allPlayersAllIn, activePlayers, playersWithVisibleCards]);

    /**
     * Get community cards from game state
     */
    const communityCards = useMemo(() => {
        if (!gameState?.communityCards) return [];
        return gameState.communityCards.filter(
            (c: string) => c && c !== "??" && c !== "XX"
        );
    }, [gameState?.communityCards]);

    /**
     * Calculate equity via API call
     */
    const calculateEquity = useCallback(async () => {
        if (!shouldShow || playersWithVisibleCards.length < 2) {
            setEquities(new Map());
            return;
        }

        // Create a cache key to avoid duplicate calculations
        const cacheKey = JSON.stringify({
            hands: playersWithVisibleCards.map(p => p.cards),
            board: communityCards
        });

        if (cacheKey === lastCalculationRef.current) {
            return; // Already calculated this exact state
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${currentNetwork.rest}/block52/pokerchain/poker/v1/equity`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        hands: playersWithVisibleCards.map(p => ({ cards: p.cards })),
                        board: communityCards,
                        dead: [],
                        simulations: 10000
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Equity calculation failed: ${response.statusText}`);
            }

            const data = await response.json();
            const results: EquityResult[] = data.results || [];

            // Map results back to seat indices
            const newEquities = new Map<number, number>();
            results.forEach((result, idx) => {
                if (idx < playersWithVisibleCards.length) {
                    const seat = playersWithVisibleCards[idx].seat;
                    // Convert total equity (e.g., "0.7257") to percentage (72.57)
                    const equityPercent = parseFloat(result.total) * 100;
                    newEquities.set(seat, equityPercent);
                }
            });

            setEquities(newEquities);
            lastCalculationRef.current = cacheKey;

            console.log("🎲 Equity calculated:", {
                hands: playersWithVisibleCards.map(p => ({ seat: p.seat, cards: p.cards })),
                board: communityCards,
                results: Array.from(newEquities.entries()).map(([seat, eq]) => ({ seat, equity: `${eq.toFixed(1)}%` }))
            });
        } catch (err) {
            console.error("❌ Equity calculation error:", err);
            setError(err as Error);
            setEquities(new Map());
        } finally {
            setIsLoading(false);
        }
    }, [shouldShow, playersWithVisibleCards, communityCards, currentNetwork.rest]);

    /**
     * Recalculate equity when conditions change
     */
    useEffect(() => {
        if (shouldShow) {
            // Debounce the calculation slightly to avoid rapid re-calls
            const timeout = setTimeout(() => {
                calculateEquity();
            }, 300);
            return () => clearTimeout(timeout);
        } else {
            // Clear equities when conditions are not met
            setEquities(new Map());
            lastCalculationRef.current = "";
        }
    }, [shouldShow, calculateEquity]);

    return {
        equities,
        shouldShow,
        isLoading,
        error
    };
}

export default useAllInEquity;
