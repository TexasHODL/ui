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