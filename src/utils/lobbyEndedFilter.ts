import { SCHEDULED_SNG_GRACE_MS, scheduledSngPhase } from "./scheduledSng";
import type { ActionDTO } from "@block52/poker-vm-sdk";
import { blindLevelSecondsRemaining } from "./blindLevelTimer";

/** Minimal progress shape used to age out finished lobby rows. */
export type LobbyEndedProgress = {
    mark: "started" | "finished";
    /** Epoch ms when the tournament ended (last previousActions.timestamp). */
    endedAtMs?: number;
    /** Started, and late registration was open at the last poll (poker-vm#2731). */
    lateRegOpen?: boolean;
    /** When late registration closes (epoch ms), if known. */
    lateRegEndsAtMs?: number;
    /** Started: blind timer from gameOptions, for the stuck-table check. */
    blindTimer?: { levelStartTime?: number; blindLevelDuration?: number };
};

/**
 * Rolldown co-bundles this module with TableList and mangles exports / imports
 * to the same short names as TableList locals (`games`/`W`, `isLoading`/`a`,
 * `isDeleting`/`u`, …). Those locals can overwrite live module bindings after
 * first render, so aging fails open in production.
 *
 * Keep hide logic inside this IIFE and snapshot every value the hide path
 * needs (retention, grace, phase helper) as consts — same defense as #93 for
 * retentionMs. Call shouldHide only via the closed-over binding, never a
 * reassignable live export.
 */
const lobbyEndedFilterApi = (() => {
    const retentionMs = 24 * 60 * 60 * 1000;
    // Snapshot at init — do not read SCHEDULED_SNG_GRACE_MS / scheduledSngPhase
    // through free module bindings inside shouldHide (prod mangled them to `a` /
    // `u`, which TableList also uses for isLoading / isDeleting).
    const graceMs = SCHEDULED_SNG_GRACE_MS;
    const phaseOf = scheduledSngPhase;
    const stuckOverdueMs = 6 * 60 * 60 * 1000;
    const secondsRemainingOf = blindLevelSecondsRemaining;

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

    /** Coerce epoch ms; string SST would concat with grace and fail open. */
    function startTimeMs(value: unknown): number | undefined {
        if (value == null || value === "") return undefined;
        const ms = typeof value === "number" ? value : Number(value);
        return Number.isFinite(ms) && ms > 0 ? ms : undefined;
    }

    /**
     * Hide Finished or Cancelled lobby rows once they have been ended for
     * retentionMs. Non-ended rows always stay. Finished rows without a
     * reliable endedAtMs stay visible (fail open).
     *
     * Cancelled time = scheduledStartTime + graceMs.
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
        if (progress?.mark === "started") {
            // Stuck in-play table: next blind level overdue by > stuckOverdueMs.
            // Live hands only run minutes past a level end (30s action
            // timeouts), so hours of overtime means the table has locked up.
            const remaining = secondsRemainingOf(progress.blindTimer, nowMs);
            return typeof remaining === "number" && -remaining * 1000 > stuckOverdueMs;
        }

        const scheduledStartTime = startTimeMs(game.scheduledStartTime);
        const phase = phaseOf({
            scheduledStartTime,
            minPlayers: game.minPlayers,
            registered: game.currentPlayers,
            nowMs
        });
        if (phase !== "cancelled" || scheduledStartTime === undefined) return false;
        const cancelAt = scheduledStartTime + graceMs;
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
        LOBBY_STUCK_LEVEL_OVERDUE_MS: stuckOverdueMs,
        maxPreviousActionTimestamp,
        shouldHideEndedLobbyGame,
        applyEndedLobbyRetention
    };
})();

/** How long Finished / Cancelled rows stay in the lobby after they end. */
export const LOBBY_ENDED_RETENTION_MS = lobbyEndedFilterApi.LOBBY_ENDED_RETENTION_MS;

/**
 * Started SNG/tournament rows are hidden from the lobby list once the next
 * blind level is overdue by more than this (the table header shows the same
 * value, e.g. "-360:00 to next level"). 6h is far beyond any real hand
 * overtime and well under the stuck tables seen in prod (~13 and ~53 days).
 * List-only: direct links and lobby search still show the table.
 */
export const LOBBY_STUCK_LEVEL_OVERDUE_MS = lobbyEndedFilterApi.LOBBY_STUCK_LEVEL_OVERDUE_MS;

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
