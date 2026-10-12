import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import type { GameWithFormat } from "./convertUtils";
import { filterLobbyGames } from "./lobbyFilters";

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
    it("sorts buy-ins numerically, preserving precision for micro-unit strings", () => {
        const expensive = makeGame({ gameId: "expensive", minBuyIn: "9007199254740993" });
        const cheaper = makeGame({ gameId: "cheaper", minBuyIn: "9007199254740992" });
        expect(filterLobbyGames([expensive, cheaper], { ...options, sort: "buyin" }).map(game => game.gameId)).toEqual(["cheaper", "expensive"]);
    });
});
