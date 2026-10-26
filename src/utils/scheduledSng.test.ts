import { NonPlayerActionType, PlayerActionType, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { GameFormat } from "@block52/poker-vm-sdk";
import { LATE_REGISTRATION_LEVEL_OPTIONS, lateRegistrationOptionLabel, SCHEDULED_SNG_GRACE_MS, formatCountdown, hasTournamentFinished, hasTournamentStarted, isScheduledSng, localDateTimeToUnixSeconds, scheduledLobbyLabel, scheduledSngPhase, scheduledStartRejection, tournamentRegistrationClosed, formatLateRegistration, lateRegistrationEndsAt, lateRegistrationPhase } from "./scheduledSng";
import type { GameOptionsDTO, ResultDTO } from "@block52/poker-vm-sdk";

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

describe("late registration (poker-vm#2731)", () => {
    const firstDeal = 1_700_000_000_000;
    const options = (extra: Partial<GameOptionsDTO> = {}): GameOptionsDTO => ({
        minBuyIn: "1000000", maxBuyIn: "1000000", minPlayers: 2, maxPlayers: 9, smallBlind: "50", bigBlind: "100", timeout: 30,
        blindLevelDuration: 10, scheduledStartTime: firstDeal - 60_000, lateRegistrationLevels: 2, sngStartTime: firstDeal, ...extra
    });
    const started = { handNumber: 3, previousActions: [] };
    const state = (extra: Partial<GameOptionsDTO> = {}, results: ResultDTO[] = []) => ({ ...started, gameOptions: options(extra), results });

    it("is none before the start, or without the option", () => {
        expect(lateRegistrationPhase({ ...state(), handNumber: 1 }, firstDeal)).toBe("none");
        expect(lateRegistrationPhase(state({ lateRegistrationLevels: undefined }), firstDeal)).toBe("none");
        expect(lateRegistrationPhase(null, firstDeal)).toBe("none");
    });

    it("is open inside the window and closed after it", () => {
        expect(lateRegistrationPhase(state(), firstDeal + 19 * 60_000)).toBe("open");
        expect(lateRegistrationPhase(state(), firstDeal + 20 * 60_000)).toBe("closed");
        expect(lateRegistrationEndsAt(options())).toBe(firstDeal + 20 * 60_000);
    });

    it("closes once anyone has finished in the money", () => {
        expect(lateRegistrationPhase(state({}, [{ place: 3, playerId: "b52third", payout: "1260000" }]), firstDeal)).toBe("closed");
        expect(lateRegistrationPhase(state({}, [{ place: 7, playerId: "b52bust", payout: "0" }]), firstDeal)).toBe("open");
    });

    it("keeps a started tournament open to new players while late registration is open", () => {
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, state(), firstDeal + 19 * 60_000)).toBe(false);
        expect(tournamentRegistrationClosed(GameFormat.TOURNAMENT, state(), firstDeal + 19 * 60_000)).toBe(false);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, state(), firstDeal + 20 * 60_000)).toBe(true);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, state({}, [{ place: 3, playerId: "b52third", payout: "1260000" }]), firstDeal)).toBe(true);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, state({ lateRegistrationLevels: undefined }), firstDeal)).toBe(true);
        expect(tournamentRegistrationClosed(GameFormat.SIT_AND_GO, { ...state(), results: [{ place: 1, playerId: "w", payout: "0" }] }, firstDeal)).toBe(true);
    });

    it("tolerates public state without results or options", () => {
        expect(lateRegistrationPhase({ ...started, gameOptions: options(), results: undefined } as never, firstDeal)).toBe("open");
        expect(lateRegistrationPhase({ ...started, gameOptions: undefined } as never, firstDeal)).toBe("none");
    });

    it("labels a started tournament with late registration open in the lobby", () => {
        const label = scheduledLobbyLabel({ phase: "ready", scheduledStartTime: firstDeal, minPlayers: 2, started: true, finished: false, lateRegistrationOpen: true, lateRegistrationEndsAt: firstDeal + 20 * 60_000, nowMs: firstDeal });
        expect(label).toMatch(/^Started · Late reg open until /);
        expect(scheduledLobbyLabel({ phase: "ready", scheduledStartTime: firstDeal, minPlayers: 2, started: true, finished: false, lateRegistrationOpen: false })).toBe("Started");
    });

    it("labels the window", () => {
        expect(formatLateRegistration(3)).toBe("Late reg: 3 levels");
        expect(formatLateRegistration(1)).toBe("Late reg: 1 level");
        expect(formatLateRegistration(undefined)).toBe("");
        expect(formatLateRegistration(0)).toBe("");
    });
});

describe("late registration create choices (ui#881)", () => {
    it("starts with off and offers whole levels", () => {
        expect(LATE_REGISTRATION_LEVEL_OPTIONS[0]).toBe(0);
        expect(LATE_REGISTRATION_LEVEL_OPTIONS.every(n => Number.isInteger(n) && n >= 0)).toBe(true);
    });
    it("labels each choice", () => {
        expect(lateRegistrationOptionLabel(0)).toBe("Off: the field is fixed at the start");
        expect(lateRegistrationOptionLabel(1)).toBe("Open for the first 1 blind level");
        expect(lateRegistrationOptionLabel(3)).toBe("Open for the first 3 blind levels");
    });
});
