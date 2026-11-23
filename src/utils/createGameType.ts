/**
 * The game types a player can CREATE (ui#823): Cash Game, Sit & Go and
 * Tournament, each its own format on chain (poker-vm#2776). A **Sit & Go** with
 * the schedule off is format sit-and-go and starts when the table fills. A start
 * time is format tournament: it starts at that time with at least the minimum
 * registered, never earlier. SDK 1.24 refuses a start time on a sit-and-go.
 *
 * Keeping the distinction here, in one tested place, means the create forms, the
 * lobby and the table header agree on what to call a table.
 */
import { GameFormat } from "@block52/poker-vm-sdk";
import { hasContent, hasValue } from "@block52/ui-sdk/helpers";
import { isScheduledSng } from "./scheduledSng";
import { parseTournamentGameId } from "./tableUrl";

export type CreateGameType = "cash" | "sit-and-go" | "tournament" | "multi-table";

export const CREATE_GAME_TYPES: readonly CreateGameType[] = ["sit-and-go", "cash", "tournament", "multi-table"];

/** Coerce a raw select value into a CreateGameType, undefined for anything else. */
export const toCreateGameType = (value: string | undefined): CreateGameType | undefined =>
    value === "cash" || value === "sit-and-go" || value === "tournament" || value === "multi-table" ? value : undefined;

/** A multi-table tournament is created with createTournament, not as a table. */
export const isMultiTableCreateType = (type: CreateGameType): boolean => type === "multi-table";

/** The label the create forms show for a type. */
export const createGameTypeLabel = (type: CreateGameType): string => {
    switch (type) {
        case "cash":
            return "Cash Game";
        case "sit-and-go":
            return "Sit & Go";
        case "tournament":
            return "Tournament";
        case "multi-table":
            return "Multi-table tournament";
    }
};

/**
 * The chain format a table type is created as.
 * Multi-table is not a table: callers branch on {@link isMultiTableCreateType}
 * and never submit this value. Cash is returned so a stray read does not look
 * like a sit-and-go.
 */
export const createGameTypeFormat = (type: CreateGameType): GameFormat => {
    switch (type) {
        case "cash":
        case "multi-table":
            return GameFormat.CASH;
        case "sit-and-go":
            return GameFormat.SIT_AND_GO;
        case "tournament":
            return GameFormat.TOURNAMENT;
    }
};

/** Whether a type carries a start time (the Tournament type always does). */
export const isScheduledCreateType = (type: CreateGameType): boolean => type === "tournament";

export interface CreatedTableFormat {
    format: GameFormat;
    /** Set only for a tournament. A sit-and-go and a cash game never carry one. */
    startTime: number | undefined;
}

/** The Sit & Go switch, shown whether it is off or on. */
export const SIT_AND_GO_SCHEDULE_DESCRIPTION =
    "Off, this Sit & Go starts when the table is full. On, it is created as a tournament and starts at the start time, never earlier.";

/** The note under the fields once that switch is on. */
export const SCHEDULED_SIT_AND_GO_NOTE =
    "Created as a tournament. Starts at the start time with at least the minimum, never earlier. Cancelled with refunds if fewer have registered 15 minutes after the start time.";

/**
 * What createGame should send (SDK 1.24).
 *
 * A Sit & Go with the schedule card on is created as a tournament, so the start
 * time is legal and the table waits for that time instead of dealing early. A
 * Sit & Go with the card off stays sit-and-go and drops any start time. Cash is
 * unchanged.
 */
export const createdTableFormat = (type: CreateGameType, sitAndGoScheduleOn: boolean, startTime: number | undefined): CreatedTableFormat => {
    if (type === "multi-table") {
        throw new Error("A multi-table tournament is created with createTournament, not as a table");
    }
    if (type === "tournament" || (type === "sit-and-go" && sitAndGoScheduleOn)) {
        return { format: GameFormat.TOURNAMENT, startTime };
    }
    if (type === "sit-and-go") {
        return { format: GameFormat.SIT_AND_GO, startTime: undefined };
    }
    return { format: GameFormat.CASH, startTime: undefined };
};

/** Lobby, table-header, session-history, and stakes name for an unscheduled Sit & Go. */
export const SIT_AND_GO_LABEL = "Sit & Go";

/** Lobby, table-header, and session-history name for a single-table tournament. */
export const SINGLE_TABLE_TOURNAMENT_LABEL = "Single-table tournament";

/** Lobby, event-page, and stakes name for a multi-table tournament. */
export const MULTI_TABLE_TOURNAMENT_LABEL = "Multi-table tournament";

/**
 * What to call a table the lobby and the table header are showing. A sit-and-go
 * with a start time, or a chain tournament table, is a **Single-table tournament**.
 * An unscheduled Sit & Go is labelled {@link SIT_AND_GO_LABEL}. Cash keeps the SDK's format display.
 * A directed multi-table table (game id `<tournamentId>-t<n>`) is a {@link MULTI_TABLE_TOURNAMENT_LABEL}.
 */
export const displayGameFormat = (
    format: GameFormat | "unknown" | null | undefined,
    scheduledStartTime: number | undefined,
    fallback: (format: GameFormat | "unknown") => string,
    gameId?: string
): string => {
    if (!hasValue(format)) return "";
    if (hasContent(gameId) && hasValue(parseTournamentGameId(gameId))) return MULTI_TABLE_TOURNAMENT_LABEL;
    if (format === GameFormat.TOURNAMENT || (format === GameFormat.SIT_AND_GO && isScheduledSng({ scheduledStartTime }))) {
        return SINGLE_TABLE_TOURNAMENT_LABEL;
    }
    if (format === GameFormat.SIT_AND_GO) return SIT_AND_GO_LABEL;
    return fallback(format);
};

/** What a fixed-buy-in table is called in the join and buy-in modals (ui#934). */
export const sitAndGoTypeLabel = (scheduledStartTime: number | undefined): string => (isScheduledSng({ scheduledStartTime }) ? SINGLE_TABLE_TOURNAMENT_LABEL : SIT_AND_GO_LABEL);

/** The join modal's heading: single-table for a scheduled start, "Sit & Go Tournament" otherwise. */
export const sitAndGoJoinTitle = (scheduledStartTime: number | undefined): string =>
    isScheduledSng({ scheduledStartTime }) ? SINGLE_TABLE_TOURNAMENT_LABEL : "Sit & Go Tournament";
