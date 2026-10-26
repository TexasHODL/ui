import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import { tournamentProgressFromPublicState } from "../hooks/game/useLobbyTournamentStarted";
import { blindLevelSecondsRemaining } from "./blindLevelTimer";
import { applyEndedLobbyRetention, LOBBY_STUCK_LEVEL_OVERDUE_MS, shouldHideEndedLobbyGame } from "./lobbyEndedFilter";

// Public state of the two stuck prod SNGs (play.texashodl.net), trimmed to the
// fields the lobby reads. Neither has a place-1 result, so both read "started".
const STUCK_A = {
    id: "0x2a66ced7bc8f20dbf7b36d91143456d2b5f81048df30f4393378d07e2bbdcb41",
    state: {
        handNumber: 27, round: TexasHoldemRound.ANTE, previousActions: [],
        results: [{ place: 4, playerId: "a", payout: "0" }, { place: 3, playerId: "b", payout: "0" }, { place: 2, playerId: "c", payout: "120000" }],
        gameOptions: { blindLevelDuration: 10, blindLevel: 4, sngStartTime: 1788390638918, levelStartTime: 1788393038918 }
    }
};
const STUCK_B = {
    id: "0xefd4a7da94cfb9e89c9c3b62307f14a5839aab7f9f726fc9b21c2da9882679e0",
    state: {
        handNumber: 10, round: TexasHoldemRound.END, previousActions: [{ timestamp: 1791886887700 }],
        results: [{ place: 6, playerId: "d", payout: "0" }, { place: 5, playerId: "e", payout: "0" }, { place: 4, playerId: "f", payout: "0" }],
        gameOptions: { blindLevelDuration: 5, blindLevel: 3, sngStartTime: 1791885737783, levelStartTime: 1791886637783 }
    }
};
// 2026-10-26 16:00 AEST, when the tables were reported.
const NOW = Date.UTC(2026, 9, 26, 6, 0, 0);
const game = (gameId: string) => ({ gameId, minPlayers: 4, currentPlayers: 4 });
const progressOf = (state: unknown) =>
    tournamentProgressFromPublicState({ game_state: JSON.stringify({ format: "sit-and-go", variant: "texas-holdem", gameState: state }) }) ?? undefined;

describe("stuck in-play lobby tables (blind level long overdue)", () => {
    it("hides both stuck prod tables", () => {
        for (const table of [STUCK_A, STUCK_B]) {
            const progress = progressOf(table.state);
            expect(progress?.mark).toBe("started");
            const overdueMs = -blindLevelSecondsRemaining(table.state.gameOptions, NOW)! * 1000;
            expect(overdueMs).toBeGreaterThan(LOBBY_STUCK_LEVEL_OVERDUE_MS);
            expect(shouldHideEndedLobbyGame(game(table.id), progress, NOW)).toBe(true);
        }
    });

    it("keeps them findable by search", () => {
        const games = [game(STUCK_A.id), game(STUCK_B.id)];
        const progress = { [STUCK_A.id]: progressOf(STUCK_A.state), [STUCK_B.id]: progressOf(STUCK_B.state) };
        expect(applyEndedLobbyRetention(games, progress, NOW, "")).toEqual([]);
        expect(applyEndedLobbyRetention(games, progress, NOW, "0x2a66")).toEqual(games);
    });

    it("keeps live tables, including ones in normal hand overtime", () => {
        const levelStartTime = NOW - 10 * 60 * 1000; // 5-min level, 5 min overdue
        const progress = { mark: "started" as const, blindTimer: { levelStartTime, blindLevelDuration: 5 } };
        expect(shouldHideEndedLobbyGame(game("live"), progress, NOW)).toBe(false);
        const justUnder = { mark: "started" as const, blindTimer: { levelStartTime: NOW - 5 * 60 * 1000 - LOBBY_STUCK_LEVEL_OVERDUE_MS + 1000, blindLevelDuration: 5 } };
        expect(shouldHideEndedLobbyGame(game("live"), justUnder, NOW)).toBe(false);
        // A table 24h overdue is still well inside the 48h limit.
        const dayOverdue = { mark: "started" as const, blindTimer: { levelStartTime: NOW - 5 * 60 * 1000 - 24 * 60 * 60 * 1000, blindLevelDuration: 5 } };
        expect(shouldHideEndedLobbyGame(game("live"), dayOverdue, NOW)).toBe(false);
    });

    it("uses a 48h overdue limit", () => {
        expect(LOBBY_STUCK_LEVEL_OVERDUE_MS).toBe(48 * 60 * 60 * 1000);
    });

    it("never hides started tables without a blind timer (cash-like)", () => {
        expect(shouldHideEndedLobbyGame(game("cash"), { mark: "started" }, NOW)).toBe(false);
        expect(blindLevelSecondsRemaining({ levelStartTime: 1, blindLevelDuration: 0 }, NOW)).toBeUndefined();
        expect(blindLevelSecondsRemaining(undefined, NOW)).toBeUndefined();
    });

    it("matches the header countdown formula", () => {
        expect(blindLevelSecondsRemaining({ levelStartTime: NOW - 61_500, blindLevelDuration: 3 }, NOW)).toBe(180 - 61);
    });
});