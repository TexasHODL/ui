import { GameFormat, NonPlayerActionType, PlayerActionType, TexasHoldemRound, isLateRegistrationOpen, lateRegistrationClosesAt, type ActionDTO, type GameOptionsDTO, type TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { isSitAndGoFormat, isTournamentFormat } from "./gameFormatUtils";
import { hasValue, isNullish } from "./guards";

/**
 * Scheduled single-table tournaments (poker-vm#2680).
 *
 * A sit-and-go with gameOptions.scheduledStartTime (epoch ms) starts when the
 * table fills OR at that time with at least minPlayers registered (any
 * registered player sends START; the engine offers it in legalActions once it
 * is due). If fewer than minPlayers have registered SCHEDULED_SNG_GRACE_MS after
 * the start time, the table is cancelled: joins are refused and players leave
 * with a refund. These helpers are pure so the lobby and the table page agree.
 */

/** The engine's grace window after a scheduled start before cancellation. */
export const SCHEDULED_SNG_GRACE_MS = 15 * 60 * 1000;

export type ScheduledSngPhase =
    | "unscheduled" // no start time: starts only when the table is full
    | "registering" // before the start time
    | "ready" // start time passed with enough players: START is due
    | "short" // start time passed, too few players, still inside the grace window
    | "cancelled"; // grace window passed with too few players

export interface ScheduledSngInput {
    scheduledStartTime: number | undefined;
    minPlayers: number;
    registered: number;
    nowMs: number;
}

export const isScheduledSng = (options: Pick<GameOptionsDTO, "scheduledStartTime"> | null | undefined): boolean =>
    hasValue(options?.scheduledStartTime) && options.scheduledStartTime > 0;

export const scheduledSngPhase = ({ scheduledStartTime, minPlayers, registered, nowMs }: ScheduledSngInput): ScheduledSngPhase => {
    if (isNullish(scheduledStartTime) || scheduledStartTime <= 0) return "unscheduled";
    if (nowMs < scheduledStartTime) return "registering";
    if (registered >= minPlayers) return "ready";
    if (nowMs < scheduledStartTime + SCHEDULED_SNG_GRACE_MS) return "short";
    return "cancelled";
};

const STARTED_ACTIONS: ReadonlySet<string> = new Set<string>([
    NonPlayerActionType.START,
    PlayerActionType.SMALL_BLIND,
    PlayerActionType.BIG_BLIND
]);

/** A hand that has left the waiting ante. Ante itself is still "not started". */
const IN_PLAY_ROUNDS: ReadonlySet<string> = new Set<string>([
    TexasHoldemRound.PREFLOP,
    TexasHoldemRound.FLOP,
    TexasHoldemRound.TURN,
    TexasHoldemRound.RIVER,
    TexasHoldemRound.SHOWDOWN,
    TexasHoldemRound.END
]);

/**
 * Whether the tournament is in play: past the first hand, the round has left
 * the waiting ante, or hand 1 has been started (START recorded) or a blind has
 * been posted. Once in play the field is frozen and the "waiting for players"
 * state is over, even with empty seats.
 */
export const hasTournamentStarted = (
    gameState: Partial<Pick<TexasHoldemStateDTO, "handNumber" | "previousActions" | "round">> | null | undefined
): boolean => {
    if (isNullish(gameState)) return false;
    if (hasValue(gameState.handNumber) && gameState.handNumber > 1) return true;
    if (hasValue(gameState.round) && IN_PLAY_ROUNDS.has(gameState.round)) return true;
    const actions: ActionDTO[] = Array.isArray(gameState.previousActions) ? gameState.previousActions : [];
    return actions.some(a => STARTED_ACTIONS.has(a.action));
};

/**
 * The tournament has a winner. `results` holds final places and is filled as
 * players finish; place 1 is written only when the tournament is over.
 * `winners` is the current hand and must not be treated as the tournament result.
 */
export const hasTournamentFinished = (
    gameState: Partial<Pick<TexasHoldemStateDTO, "results">> | null | undefined
): boolean => {
    if (isNullish(gameState) || !Array.isArray(gameState.results)) return false;
    return gameState.results.some(result => result.place === 1);
};

const isTournamentProgressState = (
    value: unknown
): value is Partial<Pick<TexasHoldemStateDTO, "handNumber" | "previousActions" | "round" | "results">> =>
    typeof value === "object" && value !== null;

/**
 * A sit-and-go or tournament that is in play, or already has a winner, is
 * closed to new players. Cash games stay open. "Started" is the same public
 * state the lobby reads; place 1 in `results` means the tournament is over.
 */
export const tournamentRegistrationClosed = (format: GameFormat | string | null | undefined, gameState: unknown, nowMs: number = Date.now()): boolean => {
    if (typeof format !== "string") return false;
    if (!isSitAndGoFormat(format) && !isTournamentFormat(format)) return false;
    if (!isTournamentProgressState(gameState)) return false;
    if (hasTournamentFinished(gameState)) return true;
    if (!hasTournamentStarted(gameState)) return false;
    // Late registration (poker-vm#2731): a started tournament stays open to new
    // players until the late-reg window closes.
    return lateRegistrationPhase(gameState as Parameters<typeof lateRegistrationPhase>[0], nowMs) !== "open";
};

/** "mm:ss" (or "h:mm:ss") until a time; "0:00" once passed. */
export const formatCountdown = (untilMs: number, nowMs: number): string => {
    const total = Math.max(0, Math.floor((untilMs - nowMs) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

/** A short local time, e.g. "20:30" (today) or "Oct 15, 20:30" (another day). */
export const formatStartsAt = (startMs: number, nowMs: number = Date.now()): string => {
    const start = new Date(startMs);
    const now = new Date(nowMs);
    const sameDay = start.toDateString() === now.toDateString();
    const time = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return sameDay ? time : `${start.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
};

/** Lobby status under a scheduled sit-and-go or tournament row. */
export const scheduledLobbyLabel = (input: {
    phase: ScheduledSngPhase;
    scheduledStartTime: number | undefined;
    minPlayers: number;
    started: boolean;
    finished: boolean;
    nowMs?: number;
    lateRegistrationLevels?: number;
    /** Started, but late registration is still open (poker-vm#2731). */
    lateRegistrationOpen?: boolean;
    /** When late registration closes (epoch ms), if known. */
    lateRegistrationEndsAt?: number;
}): string => {
    if (input.phase === "unscheduled" || isNullish(input.scheduledStartTime)) return "";
    if (input.finished) return "Finished";
    if (input.started && input.lateRegistrationOpen) {
        return `Started · Late reg open${hasValue(input.lateRegistrationEndsAt) ? ` until ${formatStartsAt(input.lateRegistrationEndsAt, input.nowMs)}` : ""}`;
    }
    if (input.started) return "Started";
    if (input.phase === "cancelled") return "Cancelled: not enough players";
    if (input.phase === "ready") return "Starting";
    return [`Starts ${formatStartsAt(input.scheduledStartTime, input.nowMs)} · min ${input.minPlayers}`, formatLateRegistration(input.lateRegistrationLevels)].filter(s => s !== "").join(" · ");
};

/** datetime-local input value → unix seconds (NaN when empty/invalid). */
export const localDateTimeToUnixSeconds = (value: string): number => {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : NaN;
};

/** Why a scheduled sit-and-go cannot be created, or null when the chain would accept it. */
export const scheduledStartRejection = (
    startTime: number,
    minPlayers: number,
    maxPlayers: number,
    nowSeconds = Math.floor(Date.now() / 1000)
): string | null => {
    if (!Number.isFinite(startTime) || startTime <= nowSeconds) {
        return "Pick a start time in the future for a scheduled tournament.";
    }
    if (minPlayers < 2) {
        return `Minimum players must be between 2 and ${maxPlayers}.`;
    }
    return null;
};

/**
 * Late registration (poker-vm#2731): a scheduled sit-and-go may keep taking new
 * players after it starts, while the blind level is below
 * gameOptions.lateRegistrationLevels and nobody has finished in the money.
 *
 *   - "none":   no late registration, or the tournament has not started (the
 *               normal registration rules apply);
 *   - "open":   started, and a join would still be accepted;
 *   - "closed": started, and the window has shut.
 */
export type LateRegistrationPhase = "none" | "open" | "closed";

export const lateRegistrationPhase = (
    gameState: Pick<TexasHoldemStateDTO, "gameOptions" | "results" | "handNumber" | "previousActions"> | null | undefined,
    nowMs: number
): LateRegistrationPhase => {
    if (isNullish(gameState) || isNullish(gameState.gameOptions) || isNullish(gameState.gameOptions.lateRegistrationLevels) || gameState.gameOptions.lateRegistrationLevels <= 0 || !hasTournamentStarted(gameState)) return "none";
    try {
        return isLateRegistrationOpen(gameState.gameOptions, Array.isArray(gameState.results) ? gameState.results : [], nowMs) ? "open" : "closed";
    } catch {
        // Malformed options (e.g. no blind level duration): treat as closed, as the chain would.
        return "closed";
    }
};

/** When late registration closes (epoch ms), once the first hand is dealt. */
export const lateRegistrationEndsAt = (options: GameOptionsDTO): number | undefined => lateRegistrationClosesAt(options);

/** "Late reg: 3 levels" for a table with late registration; "" otherwise. */
export const formatLateRegistration = (levels: number | undefined): string =>
    hasValue(levels) && levels > 0 ? `Late reg: ${levels} level${levels === 1 ? "" : "s"}` : "";

/** Late registration choices for a new tournament (poker-vm#2731): 0 = off,
 * else the number of blind levels it stays open after the start. */
export const LATE_REGISTRATION_LEVEL_OPTIONS: readonly number[] = [0, 1, 2, 3, 4, 6];

/** The create form's label for a late-registration choice. */
export const lateRegistrationOptionLabel = (levels: number): string =>
    levels === 0 ? "Off: the field is fixed at the start" : `Open for the first ${levels} blind level${levels === 1 ? "" : "s"}`;
