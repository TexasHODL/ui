import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import type { GameWithFormat } from "./convertUtils";
import { displayTableName } from "./generatedTableName";
import { filterLobbyGames, isLobbyGameUnavailable, isOpenScheduledRegistration } from "./lobbyFilters";
import { SCHEDULED_SNG_GRACE_MS } from "./scheduledSng";

const makeGame = (overrides: Partial<GameWithFormat>): GameWithFormat => ({
    gameId: "cash-empty",
    name: "Evening game",
    minBuyIn: "400000",
    maxBuyIn: "2000000",
    minPlayers: 2,
    maxPlayers: 6,
    currentPlayers: 0,
    gameFormat: GameFormat.CASH,
    gameVariant: GameVariant.TEXAS_HOLDEM,
    smallBlind: "10000",
    bigBlind: "20000",
    status: "waiting",
    ...overrides
});
const options = { format: "all", search: "", openOnly: false, sort: "activity" } as const;
const games = [
    makeGame({}),
    makeGame({ gameId: "cash-full", currentPlayers: 6 }),
    makeGame({ gameId: "cash-active", currentPlayers: 3 }),
    makeGame({ gameId: "sng-open", name: "Friday final", gameFormat: GameFormat.SIT_AND_GO, currentPlayers: 2, minBuyIn: "1000000" })
];

describe("lobby discovery", () => {
    it("puts occupied joinable tables first and full watchable tables last without mutating input", () => {
        const original = games.map(game => game.gameId);
        expect(filterLobbyGames(games, options).map(game => game.gameId)).toEqual(["cash-active", "sng-open", "cash-empty", "cash-full"]);
        expect(games.map(game => game.gameId)).toEqual(original);
    });
    it("combines format and open-seat filters", () => {
        expect(filterLobbyGames(games, { ...options, format: "cash", openOnly: true }).map(game => game.gameId)).toEqual(["cash-active", "cash-empty"]);
        expect(filterLobbyGames(games, { ...options, format: "tournament" }).map(game => game.gameId)).toEqual(["sng-open"]);
    });
    it("finds names or IDs case-insensitively and handles no matches", () => {
        expect(filterLobbyGames(games, { ...options, search: "  FRIDAY  " })[0].gameId).toBe("sng-open");
        expect(filterLobbyGames(games, { ...options, search: "CASH-ACTIVE" })[0].gameId).toBe("cash-active");
        expect(filterLobbyGames(games, { ...options, search: "not-a-table" })).toEqual([]);
    });
    it("finds an unnamed table by its generated display name", () => {
        const unnamed = makeGame({ gameId: "0x031d57314cc4ba07a0ae7edaa0c8c9ff3507dc81b8af99ac8cfe5ba9f5f9aea9", name: undefined });
        const generated = displayTableName(undefined, unnamed.gameId);
        expect(filterLobbyGames([unnamed], { ...options, search: generated })[0].gameId).toBe(unnamed.gameId);
        expect(filterLobbyGames([unnamed], { ...options, search: generated.slice(0, 6) })[0].gameId).toBe(unnamed.gameId);
    });
    it("sorts buy-ins numerically, preserving precision for micro-unit strings", () => {
        const expensive = makeGame({ gameId: "expensive", minBuyIn: "9007199254740993" });
        const cheaper = makeGame({ gameId: "cheaper", minBuyIn: "9007199254740992" });
        expect(filterLobbyGames([expensive, cheaper], { ...options, sort: "buyin" }).map(game => game.gameId)).toEqual(["cheaper", "expensive"]);
    });
    it("sinks Started and Finished tournaments below joinable tables for Available first", () => {
        const started = makeGame({
            gameId: "crypto-winter",
            name: "Crypto Winter",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 7,
            maxPlayers: 9,
            minPlayers: 4
        });
        const finished = makeGame({
            gameId: "public-money",
            name: "Public Money",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 1,
            maxPlayers: 9,
            minPlayers: 4
        });
        const cashJoinable = makeGame({ gameId: "cash-joinable", currentPlayers: 2 });
        const progress = {
            "crypto-winter": { mark: "started" as const },
            "public-money": { mark: "finished" as const }
        };
        expect(
            filterLobbyGames([started, finished, cashJoinable, games[1]], { ...options, progress }).map(g => g.gameId)
        ).toEqual(["cash-joinable", "crypto-winter", "cash-full", "public-money"]);
    });
    it("sinks Cancelled scheduled SNGs below joinable tables", () => {
        const nowMs = 1_700_000_000_000;
        const cancelled = makeGame({
            gameId: "cancelled-sng",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 2,
            maxPlayers: 9,
            minPlayers: 4,
            scheduledStartTime: nowMs - SCHEDULED_SNG_GRACE_MS - 1
        });
        const joinable = makeGame({ gameId: "cash-joinable", currentPlayers: 1 });
        expect(
            filterLobbyGames([cancelled, joinable], { ...options, nowMs }).map(g => g.gameId)
        ).toEqual(["cash-joinable", "cancelled-sng"]);
        expect(isLobbyGameUnavailable(cancelled, undefined, nowMs)).toBe(true);
    });
    it("keeps buy-in primary for buyin sort, then prefers available over unavailable on ties", () => {
        const cheapStarted = makeGame({
            gameId: "cheap-started",
            minBuyIn: "100000",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 7,
            maxPlayers: 9
        });
        const cheapOpen = makeGame({ gameId: "cheap-open", minBuyIn: "100000", currentPlayers: 2 });
        const expensiveOpen = makeGame({ gameId: "expensive-open", minBuyIn: "500000", currentPlayers: 3 });
        const progress = { "cheap-started": { mark: "started" as const } };
        expect(
            filterLobbyGames([expensiveOpen, cheapStarted, cheapOpen], { ...options, sort: "buyin", progress }).map(
                g => g.gameId
            )
        ).toEqual(["cheap-open", "cheap-started", "expensive-open"]);
    });
    it("puts open scheduled registration above empty unscheduled SNGs, with Started/full at bottom", () => {
        const nowMs = 1_700_000_000_000;
        const bitcoinCandle = makeGame({
            gameId: "bitcoin-candle",
            name: "Bitcoin Candle",
            gameFormat: GameFormat.TOURNAMENT,
            currentPlayers: 0,
            maxPlayers: 9,
            minPlayers: 2,
            scheduledStartTime: nowMs + 60 * 60 * 1000
        });
        const cryptoDegen = makeGame({
            gameId: "crypto-degen",
            name: "Crypto Degen",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 0,
            maxPlayers: 4,
            minPlayers: 2
        });
        const anteUp = makeGame({
            gameId: "ante-up",
            name: "Ante Up",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 0,
            maxPlayers: 4,
            minPlayers: 2
        });
        const cryptoWinter = makeGame({
            gameId: "crypto-winter",
            name: "Crypto Winter",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 7,
            maxPlayers: 9,
            minPlayers: 4
        });
        const moonMission = makeGame({
            gameId: "moon-mission",
            name: "Moon Mission",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 6,
            maxPlayers: 6,
            minPlayers: 2
        });
        const progress = { "crypto-winter": { mark: "started" as const } };
        expect(isOpenScheduledRegistration(bitcoinCandle, undefined, nowMs)).toBe(true);
        expect(isOpenScheduledRegistration(cryptoDegen, undefined, nowMs)).toBe(false);
        expect(
            filterLobbyGames([cryptoDegen, anteUp, bitcoinCandle, cryptoWinter, moonMission], {
                ...options,
                nowMs,
                progress
            }).map(g => g.gameId)
        ).toEqual(["bitcoin-candle", "ante-up", "crypto-degen", "crypto-winter", "moon-mission"]);
    });
    it("among open scheduled tables, sorts soonest start first", () => {
        const nowMs = 1_700_000_000_000;
        const later = makeGame({
            gameId: "later-tourney",
            gameFormat: GameFormat.TOURNAMENT,
            currentPlayers: 1,
            maxPlayers: 9,
            minPlayers: 2,
            scheduledStartTime: nowMs + 2 * 60 * 60 * 1000
        });
        const sooner = makeGame({
            gameId: "sooner-tourney",
            gameFormat: GameFormat.TOURNAMENT,
            currentPlayers: 0,
            maxPlayers: 9,
            minPlayers: 2,
            scheduledStartTime: nowMs + 30 * 60 * 1000
        });
        const emptySng = makeGame({
            gameId: "empty-sng",
            gameFormat: GameFormat.SIT_AND_GO,
            currentPlayers: 3,
            maxPlayers: 6,
            minPlayers: 2
        });
        expect(
            filterLobbyGames([later, emptySng, sooner], { ...options, nowMs }).map(g => g.gameId)
        ).toEqual(["sooner-tourney", "later-tourney", "empty-sng"]);
    });
    it("does not treat Started or Cancelled scheduled tables as open registration", () => {
        const nowMs = 1_700_000_000_000;
        const startedScheduled = makeGame({
            gameId: "started-scheduled",
            gameFormat: GameFormat.TOURNAMENT,
            currentPlayers: 5,
            maxPlayers: 9,
            minPlayers: 2,
            scheduledStartTime: nowMs - 60_000
        });
        const cancelled = makeGame({
            gameId: "cancelled-scheduled",
            gameFormat: GameFormat.TOURNAMENT,
            currentPlayers: 1,
            maxPlayers: 9,
            minPlayers: 4,
            scheduledStartTime: nowMs - SCHEDULED_SNG_GRACE_MS - 1
        });
        const progress = { "started-scheduled": { mark: "started" as const } };
        expect(isOpenScheduledRegistration(startedScheduled, progress["started-scheduled"], nowMs)).toBe(false);
        expect(isOpenScheduledRegistration(cancelled, undefined, nowMs)).toBe(false);
    });
});
