import { useState, useEffect, useCallback, useRef } from "react";
import { GameListItem } from "@block52/poker-vm-sdk";
import { getCosmosClient } from "../../utils/cosmos/client";
import { useNetwork } from "../../context/NetworkContext";
import { GameWithFormat, convertGameList, convertGameListItemToGameWithFormat } from "../../utils/convertUtils";
import { viteEnv } from "../../utils/viteEnv";
import { isFullGameId, type RefetchOptions } from "./useLobbyAutoRefresh";

export { isFullGameId };
export type { RefetchOptions };

export type { GameWithFormat };

export const treasuryAddress = viteEnv.VITE_TREASURY_WALLET_ADDRESS || "";

export interface FindGamesReturn {
    games: GameWithFormat[];
    isLoading: boolean;
    error: Error | null;
    refetch: (options?: RefetchOptions) => Promise<void>;
    /** Fetch one table straight from the chain by id and merge it into `games`. */
    lookupGame: (gameId: string) => Promise<GameWithFormat | null>;
}

/**
 * Builds a list item from the single-game endpoint (`/poker/v1/game/{id}`), whose
 * `game` is a JSON string with options nested under `gameState`.
 */
export const gameResponseToListItem = (response: unknown): GameListItem | null => {
    const raw = (response as { game?: unknown } | null)?.game;
    if (!raw) return null;
    const game = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown> & {
        gameState?: { gameOptions?: unknown; players?: unknown[] };
    };
    const gameOptions = (game.gameOptions ?? game.gameState?.gameOptions) as GameListItem["gameOptions"] | undefined;
    if (!game.gameId || !gameOptions) return null;
    const players = Array.isArray(game.gameState?.players) ? game.gameState.players : [];
    const { gameState: _gameState, ...rest } = game;
    void _gameState;
    return {
        ...rest,
        gameOptions,
        currentPlayers: typeof game.currentPlayers === "number" ? game.currentPlayers : players.length
    } as unknown as GameListItem;
};

/**
 * Custom hook to find available games from Cosmos blockchain
 * @returns Object containing available games and loading state
 */
export const useFindGames = (): FindGamesReturn => {
    const [games, setGames] = useState<GameWithFormat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { currentNetwork } = useNetwork();
    const inFlight = useRef<Promise<void> | null>(null);
    // Tables found by direct id lookup that the list endpoint didn't (yet) return.
    const extras = useRef<Map<string, GameWithFormat>>(new Map());

    const fetchGames = useCallback(async (options?: RefetchOptions) => {
        // Never stack requests: a poll/focus tick during a fetch reuses it.
        if (inFlight.current) return inFlight.current;
        const silent = !!options?.silent;
        const run = (async () => {
            if (!silent) {
                setIsLoading(true);
                setError(null);
            }
            try {
                const cosmosClient = getCosmosClient(currentNetwork);
                if (!cosmosClient) {
                    throw new Error("Block52 client not initialized. Please create or import a Block52 wallet first.");
                }

                // Fetch all games from Cosmos REST API
                const cosmosGames: GameListItem[] = await cosmosClient.findGames();

                // Convert SDK types to UI types, filtering out invalid entries
                const availableGames: GameWithFormat[] = convertGameList(cosmosGames);
                const listed = new Set(availableGames.map(game => game.gameId));
                listed.forEach(id => extras.current.delete(id));
                setGames([...availableGames, ...extras.current.values()]);
                if (silent) setError(null);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : "Failed to fetch games from Cosmos";
                console.error("Error fetching games from Cosmos:", err);
                // A failed background poll keeps the current list instead of showing an error.
                if (!silent) setError(new Error(errorMessage));
            } finally {
                if (!silent) setIsLoading(false);
            }
        })();
        inFlight.current = run;
        try {
            await run;
        } finally {
            inFlight.current = null;
        }
    }, [currentNetwork]);

    const lookupGame = useCallback(async (gameId: string): Promise<GameWithFormat | null> => {
        try {
            const cosmosClient = getCosmosClient(currentNetwork);
            if (!cosmosClient) return null;
            const item = gameResponseToListItem(await cosmosClient.getGame(gameId.trim()));
            if (!item) return null;
            const game = convertGameListItemToGameWithFormat(item);
            extras.current.set(game.gameId, game);
            setGames(prev => [...prev.filter(existing => existing.gameId !== game.gameId), game]);
            return game;
        } catch (err: unknown) {
            console.error("Error looking up game:", err);
            return null;
        }
    }, [currentNetwork]);

    useEffect(() => {
        extras.current.clear();
        fetchGames();
    }, [fetchGames]);

    return {
        games,
        isLoading,
        error,
        refetch: fetchGames,
        lookupGame
    };
};
