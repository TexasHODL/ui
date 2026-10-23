import { SCHEDULED_SNG_GRACE_MS } from "./scheduledSng";
import {
    LOBBY_ENDED_RETENTION_MS,
    applyEndedLobbyRetention,
    maxPreviousActionTimestamp,
    shouldHideEndedLobbyGame
} from "./lobbyEndedFilter";

const HOUR = 60 * 60 * 1000;
const now = 1_700_000_000_000;

describe("maxPreviousActionTimestamp", () => {
    it("returns the newest action timestamp", () => {
        expect(maxPreviousActionTimestamp([
            { timestamp: 100 } as never,
            { timestamp: 300 } as never,
            { timestamp: 200 } as never
        ])).toBe(300);
        expect(maxPreviousActionTimestamp([])).toBeUndefined();
        expect(maxPreviousActionTimestamp(undefined)).toBeUndefined();
    });
});

describe("shouldHideEndedLobbyGame", () => {
    const cancelledGame = {
        scheduledStartTime: now - 48 * HOUR,
        minPlayers: 4,
        currentPlayers: 1
    };

    it("keeps finished tables visible inside the 24h retention window", () => {
        expect(shouldHideEndedLobbyGame(
            cancelledGame,
            { mark: "finished", endedAtMs: now - 23 * HOUR },
            now
        )).toBe(false);
    });

    it("hides finished tables once past 24h from endedAtMs", () => {
        expect(shouldHideEndedLobbyGame(
            cancelledGame,
            { mark: "finished", endedAtMs: now - 24 * HOUR - 1 },
            now
        )).toBe(true);
    });

    it("keeps cancelled tables visible inside 24h of cancel time", () => {
        const cancelAt = cancelledGame.scheduledStartTime + SCHEDULED_SNG_GRACE_MS;
        const recentCancel = {
            ...cancelledGame,
            scheduledStartTime: now - SCHEDULED_SNG_GRACE_MS - 12 * HOUR
        };
        expect(shouldHideEndedLobbyGame(recentCancel, undefined, now)).toBe(false);
        expect(cancelAt).toBeGreaterThan(0);
    });

    it("hides cancelled tables once past 24h from cancel time", () => {
        const oldCancel = {
            scheduledStartTime: now - SCHEDULED_SNG_GRACE_MS - LOBBY_ENDED_RETENTION_MS - HOUR,
            minPlayers: 4,
            currentPlayers: 0
        };
        expect(shouldHideEndedLobbyGame(oldCancel, undefined, now)).toBe(true);
    });

    it("always shows non-finished non-cancelled tables", () => {
        const live = { scheduledStartTime: now + HOUR, minPlayers: 4, currentPlayers: 2 };
        expect(shouldHideEndedLobbyGame(live, undefined, now)).toBe(false);
        expect(shouldHideEndedLobbyGame(live, { mark: "started" }, now)).toBe(false);
        expect(shouldHideEndedLobbyGame(
            { scheduledStartTime: undefined, minPlayers: 2, currentPlayers: 2 },
            undefined,
            now
        )).toBe(false);
    });

    it("keeps finished tables visible when endedAtMs is missing", () => {
        expect(shouldHideEndedLobbyGame(cancelledGame, { mark: "finished" }, now)).toBe(false);
    });

    it("does not treat a started-then-cancelled schedule as cancelled when mark is started", () => {
        expect(shouldHideEndedLobbyGame(cancelledGame, { mark: "started" }, now)).toBe(false);
    });

    it("hides even when scheduledStartTime arrives as a numeric string (no concat)", () => {
        const oldCancel = {
            scheduledStartTime: String(
                now - SCHEDULED_SNG_GRACE_MS - LOBBY_ENDED_RETENTION_MS - HOUR
            ) as unknown as number,
            minPlayers: 2,
            currentPlayers: 1
        };
        expect(shouldHideEndedLobbyGame(oldCancel, undefined, now)).toBe(true);
    });
});

describe("applyEndedLobbyRetention", () => {
    const oldFinished = {
        gameId: "0xabadfinished",
        scheduledStartTime: now - 48 * HOUR,
        minPlayers: 2,
        currentPlayers: 1
    };
    const progress = {
        [oldFinished.gameId]: { mark: "finished" as const, endedAtMs: now - 48 * HOUR }
    };

    it("hides past-24h finished rows when search is empty", () => {
        expect(applyEndedLobbyRetention([oldFinished], progress, now, "").map(g => g.gameId)).toEqual([]);
        expect(applyEndedLobbyRetention([oldFinished], progress, now, "   ").map(g => g.gameId)).toEqual([]);
    });

    it("keeps past-24h finished rows when search is non-empty (e.g. game id)", () => {
        expect(applyEndedLobbyRetention([oldFinished], progress, now, oldFinished.gameId).map(g => g.gameId))
            .toEqual([oldFinished.gameId]);
        expect(applyEndedLobbyRetention([oldFinished], progress, now, "abad").map(g => g.gameId))
            .toEqual([oldFinished.gameId]);
    });
});

/**
 * Production Heads Up $1.00 on play.texashodl.net (still visible after #92/#93):
 * gameId 0x626ed36f…7991, scheduledStartTime 1792137600000 (2026-10-16 08:00 UTC),
 * cancel+24h due 2026-10-17 08:15 UTC. list_games returns numeric SST; public
 * state is ante/join-only so progress mark is absent (not started).
 */
describe("prod Heads Up cancelled fixture", () => {
    const headsUp = {
        gameId: "0x626ed36fb231ce7b1bc654624de1d8aa566092f13dbc59f8ab502d6f6e7f7991",
        scheduledStartTime: 1_792_137_600_000,
        minPlayers: 2,
        currentPlayers: 1
    };
    const afterRetention = headsUp.scheduledStartTime + SCHEDULED_SNG_GRACE_MS + LOBBY_ENDED_RETENTION_MS;

    it("hides after cancel+24h with empty search and no progress mark", () => {
        const nowMs = afterRetention + 1;
        expect(shouldHideEndedLobbyGame(headsUp, undefined, nowMs)).toBe(true);
        expect(
            applyEndedLobbyRetention([headsUp], {}, nowMs, "").map(g => g.gameId)
        ).toEqual([]);
    });

    it("stays findable via search after cancel+24h", () => {
        const nowMs = afterRetention + 1;
        expect(
            applyEndedLobbyRetention([headsUp], {}, nowMs, headsUp.gameId).map(g => g.gameId)
        ).toEqual([headsUp.gameId]);
        expect(
            applyEndedLobbyRetention([headsUp], {}, nowMs, "626ed36f").map(g => g.gameId)
        ).toEqual([headsUp.gameId]);
    });

    it("stays visible inside the 24h window after cancel", () => {
        const nowMs = afterRetention - 1;
        expect(shouldHideEndedLobbyGame(headsUp, undefined, nowMs)).toBe(false);
        expect(
            applyEndedLobbyRetention([headsUp], {}, nowMs, "").map(g => g.gameId)
        ).toEqual([headsUp.gameId]);
    });

    it("still hides when SST is a string form of the same epoch ms", () => {
        const nowMs = afterRetention + 1;
        const asString = {
            ...headsUp,
            scheduledStartTime: String(headsUp.scheduledStartTime) as unknown as number
        };
        expect(shouldHideEndedLobbyGame(asString, undefined, nowMs)).toBe(true);
        expect(
            applyEndedLobbyRetention([asString], {}, nowMs, "").map(g => g.gameId)
        ).toEqual([]);
    });
});
