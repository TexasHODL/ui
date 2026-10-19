import { NonPlayerActionType, PlayerActionType, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { GameFormat } from "@block52/poker-vm-sdk";
import { SCHEDULED_SNG_GRACE_MS, formatCountdown, hasTournamentFinished, hasTournamentStarted, isScheduledSng, localDateTimeToUnixSeconds, scheduledLobbyLabel, scheduledSngPhase, scheduledStartRejection, tournamentRegistrationClosed } from "./scheduledSng";

const start = 1_700_000_000_000;

describe("scheduledSngPhase", () => {
    it("is unscheduled without a start time", () => {
        expect(scheduledSngPhase({ scheduledStartTime: undefined, minPlayers: 2, registered: 1, nowMs: start })).toBe("unscheduled");
        expect(scheduledSngPhase({ scheduledStartTime: 0, minPlayers: 2, registered: 1, nowMs: start })).toBe("unscheduled");
    });
    it("registers before the start time", () => {
        expect(scheduledSngPhase({ scheduledStartTime: start, minPlayers: 2, registered: 5, nowMs: start - 1 })).toBe("registering");
    });
    it("is ready at the start time with enough players", () => {
        expect(scheduledSngPhase({ scheduledStartTime: start, minPlayers: 2, registered: 2, nowMs: start })).toBe("ready");
    });
    it("is short inside the grace window, then cancelled", () => {
        expect(scheduledSngPhase({ scheduledStartTime: start, minPlayers: 4, registered: 3, nowMs: start + SCHEDULED_SNG_GRACE_MS - 1 })).toBe("short");
        expect(scheduledSngPhase({ scheduledStartTime: start, minPlayers: 4, registered: 3, nowMs: start + SCHEDULED_SNG_GRACE_MS })).toBe("cancelled");
    });
});

describe("hasTournamentStarted", () => {
    const action = (a: string) => ({ playerId: "b521x", seat: 1, action: a as PlayerActionType, amount: "0", round: TexasHoldemRound.ANTE, index: 1, timestamp: 0 });
    it("is false while registering", () => {
        expect(hasTournamentStarted({ handNumber: 1, previousActions: [action(NonPlayerActionType.JOIN)] })).toBe(false);
        expect(hasTournamentStarted(undefined)).toBe(false);
    });
    it("is true once START or a blind is recorded, the round has left the ante, or past hand 1", () => {
        expect(hasTournamentStarted({ handNumber: 1, previousActions: [action(NonPlayerActionType.START)] })).toBe(true);
        expect(hasTournamentStarted({ handNumber: 1, previousActions: [action(PlayerActionType.SMALL_BLIND)] })).toBe(true);
        expect(hasTournamentStarted({ handNumber: 1, round: TexasHoldemRound.PREFLOP, previousActions: [] })).toBe(true);
        expect(hasTournamentStarted({ handNumber: 1, round: TexasHoldemRound.ANTE, previousActions: [] })).toBe(false);
        expect(hasTournamentStarted({ handNumber: 2, previousActions: [] })).toBe(true);
    });
});

describe("hasTournamentFinished", () => {
    it("is true only when results include first place, not a hand winner or a bust", () => {
        expect(hasTournamentFinished({ results: [{ place: 1, playerId: "winner", payout: "100" }] })).toBe(true);
        expect(hasTournamentFinished({ results: [{ place: 3, playerId: "carol", payout: "0" }, { place: 2, playerId: "alice", payout: "0" }] })).toBe(false);
        expect(hasTournamentFinished({ results: [] })).toBe(false);
        expect(hasTournamentFinished(undefined)).toBe(false);
    });
});

describe("tournamentRegistrationClosed", () => {
    const playing = { handNumber: 8, previousActions: [] };
    it("closes a started or won sit-and-go or tournament", () => {
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, playing)).toBe(true);
        expect(tournamentRegistrationClosed(GameFormat.TOURNAMENT, playing)).toBe(true);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, { results: [{ place: 1, playerId: "winner", payout: "100" }] })).toBe(true);
    });
    it("stays open for cash, and for a sit-and-go that has not started", () => {
        expect(tournamentRegistrationClosed(GameFormat.CASH, playing)).toBe(false);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, { handNumber: 1, round: "ante", previousActions: [] })).toBe(false);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, undefined)).toBe(false);
        expect(tournamentRegistrationClosed(undefined, playing)).toBe(false);
    });
});

describe("scheduledLobbyLabel", () => {
    const base = { scheduledStartTime: start, minPlayers: 4, nowMs: start, finished: false };
    it("keeps Starting only while the start is due and the hand has not begun", () => {
        expect(scheduledLobbyLabel({ ...base, phase: "ready", started: false })).toBe("Starting");
    });
    it("says Started once the game is in play, including an early fill", () => {
        expect(scheduledLobbyLabel({ ...base, phase: "ready", started: true })).toBe("Started");
        expect(scheduledLobbyLabel({ ...base, phase: "registering", started: true, nowMs: start - 1 })).toBe("Started");
    });
    it("says Finished once the tournament has a winner, and never Cancelled after it started", () => {
        expect(scheduledLobbyLabel({ ...base, phase: "ready", started: true, finished: true })).toBe("Finished");
        expect(scheduledLobbyLabel({ ...base, phase: "cancelled", started: true, finished: true })).toBe("Finished");
        expect(scheduledLobbyLabel({ ...base, phase: "cancelled", started: true })).toBe("Started");
    });
    it("keeps Cancelled for a game that never started, and the pre-start line", () => {
        expect(scheduledLobbyLabel({ ...base, phase: "cancelled", started: false })).toBe("Cancelled: not enough players");
        expect(scheduledLobbyLabel({ ...base, phase: "registering", started: false, nowMs: start - 1 })).toContain("· min 4");
        expect(scheduledLobbyLabel({ ...base, phase: "unscheduled", started: false })).toBe("");
    });
});

describe("formatting", () => {
    it("counts down in m:ss and h:mm:ss, floored at 0:00", () => {
        expect(formatCountdown(start + 754_000, start)).toBe("12:34");
        expect(formatCountdown(start + 3_661_000, start)).toBe("1:01:01");
        expect(formatCountdown(start - 5_000, start)).toBe("0:00");
    });
    it("reads a datetime-local value as unix seconds", () => {
        const secs = localDateTimeToUnixSeconds("2026-10-15T20:30");
        expect(secs).toBe(Math.floor(new Date("2026-10-15T20:30").getTime() / 1000));
        expect(Number.isNaN(localDateTimeToUnixSeconds(""))).toBe(true);
    });
    it("rejects a scheduled start that is missing, past, or under two players", () => {
        const now = 1_700_000_000;
        expect(scheduledStartRejection(Number.NaN, 4, 6, now)).toBe("Pick a start time in the future for a scheduled tournament.");
        expect(scheduledStartRejection(now, 4, 6, now)).toBe("Pick a start time in the future for a scheduled tournament.");
        expect(scheduledStartRejection(now + 60, 1, 6, now)).toBe("Minimum players must be between 2 and 6.");
        expect(scheduledStartRejection(now + 60, 2, 6, now)).toBeNull();
    });
    it("detects a scheduled table from its options", () => {
        expect(isScheduledSng({ scheduledStartTime: start })).toBe(true);
        expect(isScheduledSng({})).toBe(false);
        expect(isScheduledSng(null)).toBe(false);
    });
});
