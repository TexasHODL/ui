import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import type { GameWithFormat } from "./convertUtils";
import { applyEndedLobbyRetention, LOBBY_ENDED_RETENTION_MS, LobbyEndedProgress } from "./lobbyEndedFilter";
import { filterLobbyGames } from "./lobbyFilters";

// Lobby pipeline as TableList runs it: search filter, then 24h retention.
const finishedId = "0x4c7b6079bbecf0f2f02b424e9b91c92f1ee7c35bf452f4cd0d9774e9ba6d996c";
const finished: GameWithFormat = {
    gameId: finishedId,
    name: "side-pot-test",
    minBuyIn: "10000",
    maxBuyIn: "10000",
    minPlayers: 3,
    maxPlayers: 4,
    currentPlayers: 3,
    gameFormat: GameFormat.SIT_AND_GO,
    gameVariant: GameVariant.TEXAS_HOLDEM,
    smallBlind: "10",
    bigBlind: "20",
    status: "finished"
};
const endedAtMs = 1_793_590_000_000;
const progress: Record<string, LobbyEndedProgress> = { [finishedId]: { mark: "finished", endedAtMs } };
const run = (search: string, now: number) =>
    applyEndedLobbyRetention(
        filterLobbyGames([finished], { format: "all", search, openOnly: false, sort: "activity", progress }),
        progress,
        now,
        search
    ).map(game => game.gameId);

describe("lobby retention + search for finished tables", () => {
    const afterRetention = endedAtMs + LOBBY_ENDED_RETENTION_MS + 1;

    it("keeps a finished table listed while browsing inside 24h", () => {
        expect(run("", endedAtMs + LOBBY_ENDED_RETENTION_MS - 1)).toEqual([finishedId]);
    });

    it("hides a finished table older than 24h when browsing without a search", () => {
        expect(run("", afterRetention)).toEqual([]);
    });

    it("still finds a finished table older than 24h by full id", () => {
        expect(run(finishedId, afterRetention)).toEqual([finishedId]);
        expect(run(finishedId.toUpperCase().replace("0X", "0x"), afterRetention)).toEqual([finishedId]);
    });

    it("still finds a finished table older than 24h by name", () => {
        expect(run("side-pot", afterRetention)).toEqual([finishedId]);
    });
});