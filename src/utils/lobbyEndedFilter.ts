import { SCHEDULED_SNG_GRACE_MS, scheduledSngPhase } from "./scheduledSng";
import type { ActionDTO } from "@block52/poker-vm-sdk";

/** Minimal progress shape used to age out finished lobby rows. */
export type LobbyEndedProgress = {
    mark: "started" | "finished";
    /** Epoch ms when the tournament ended (last previousActions.timestamp). */
    endedAtMs?: number;
};

/**
 * Rolldown co-bundles this module with TableList and has mangled
 * LOBBY_ENDED_RETENTION_MS / shouldHideEndedLobbyGame / maxPreviousActionTimestamp
 * to the same short names as TableList locals (games, currentPage, pagedGames).
 * Those locals overwrite the live export bindings after first render, so aging
 * fails open in production. Keep hide logic inside this IIFE and call it only
 * via closures so overwritten export names cannot break applyEndedLobbyRetention.
 */
const lobbyEndedFilterApi = (() => {
    const retentionMs = 24 * 60 * 60 * 1000;

    function maxPreviousActionTimestamp(
        actions: ActionDTO[] | null | undefined
    ): number | undefined {
        if (!Array.isArray(actions) || actions.length === 0) return undefined;
        let max = 0;
        for (const action of actions) {
            if (typeof action.timestamp === "number" && action.timestamp > max) {
                max = action.timestamp;
            }
        }
        return max > 0 ? max : undefined;
    }

    /**
     * Hide Finished or Cancelled lobby rows once they have been ended for
     * retentionMs. Non-ended rows always stay. Finished rows without a
     * reliable endedAtMs stay visible (fail open).
     *
     * Cancelled time = scheduledStartTime + SCHEDULED_SNG_GRACE_MS.
     * Finished time = progress.endedAtMs (from public previousActions).
     */
    function shouldHideEndedLobbyGame(
        game: { scheduledStartTime?: number; minPlayers: number; currentPlayers: number },
        progress: LobbyEndedProgress | undefined,
        nowMs: number
    ): boolean {
        if (progress?.mark === "finished") {
            const endedAt = progress.endedAtMs;
            if (typeof endedAt !== "number" || endedAt <= 0) return false;
            return nowMs >= endedAt + retentionMs;
        }
        if (progress?.mark === "started") return false;

        const phase = scheduledSngPhase({
            scheduledStartTime: game.scheduledStartTime,
            minPlayers: game.minPlayers,
            registered: game.currentPlayers,
            nowMs
        });
        if (phase !== "cancelled") return false;
        const cancelAt = (game.scheduledStartTime as number) + SCHEDULED_SNG_GRACE_MS;
        return nowMs >= cancelAt + retentionMs;
    }

    /**
     * Drop past-retention Finished/Cancelled rows from an already-filtered lobby
     * list. When the user has typed a search query, skip aging so they can still
     * find an old finished table by id (or name) to review the finishing hand.
     */
    function applyEndedLobbyRetention<
        T extends { gameId: string; scheduledStartTime?: number; minPlayers: number; currentPlayers: number }
    >(
        games: T[],
        progressById: Record<string, LobbyEndedProgress | undefined>,
        nowMs: number,
        search: string
    ): T[] {
        if (search.trim()) return games;
        // Call the closed-over shouldHide — never the export binding (see IIFE note).
        return games.filter(game => !shouldHideEndedLobbyGame(game, progressById[game.gameId], nowMs));
    }

    return {
        LOBBY_ENDED_RETENTION_MS: retentionMs,
        maxPreviousActionTimestamp,
        shouldHideEndedLobbyGame,
        applyEndedLobbyRetention
    };
})();

/** How long Finished / Cancelled rows stay in the lobby after they end. */
export const LOBBY_ENDED_RETENTION_MS = lobbyEndedFilterApi.LOBBY_ENDED_RETENTION_MS;

/** Newest previousActions.timestamp, or undefined when none are usable. */
export const maxPreviousActionTimestamp = lobbyEndedFilterApi.maxPreviousActionTimestamp;

/**
 * Hide Finished or Cancelled lobby rows once they have been ended for
 * LOBBY_ENDED_RETENTION_MS. Non-ended rows always stay. Finished rows without a
 * reliable endedAtMs stay visible (fail open).
 *
 * Cancelled time = scheduledStartTime + SCHEDULED_SNG_GRACE_MS.
 * Finished time = progress.endedAtMs (from public previousActions).
 */
export const shouldHideEndedLobbyGame = lobbyEndedFilterApi.shouldHideEndedLobbyGame;

/**
 * Drop past-retention Finished/Cancelled rows from an already-filtered lobby
 * list. When the user has typed a search query, skip aging so they can still
 * find an old finished table by id (or name) to review the finishing hand.
 */
export const applyEndedLobbyRetention = lobbyEndedFilterApi.applyEndedLobbyRetention;