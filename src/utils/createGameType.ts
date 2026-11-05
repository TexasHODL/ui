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
import { hasValue } from "./guards";
import { isScheduledSng } from "./scheduledSng";

export type CreateGameType = "cash" | "sit-and-go" | "tournament";

export const CREATE_GAME_TYPES: readonly CreateGameType[] = ["sit-and-go", "cash", "tournament"];

/** Coerce a raw select value into a CreateGameType, undefined for anything else. */
export const toCreateGameType = (value: string | undefined): CreateGameType | undefined =>
    value === "cash" || value === "sit-and-go" || value === "tournament" ? value : undefined;

/** The label the create forms show for a type. */
export const createGameTypeLabel = (type: CreateGameType): string => {
    switch (type) {
        case "cash":
            return "Cash Game";
        case "sit-and-go":
            return "Sit & Go";
        case "tournament":
            return "Tournament";
    }
};

/** The chain format a type is created as. */
export const createGameTypeFormat = (type: CreateGameType): GameFormat => {
    switch (type) {
        case "cash":
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
    if (type === "tournament" || (type === "sit-and-go" && sitAndGoScheduleOn)) {
        return { format: GameFormat.TOURNAMENT, startTime };
    }
    if (type === "sit-and-go") {
        return { format: GameFormat.SIT_AND_GO, startTime: undefined };
    }
    return { format: GameFormat.CASH, startTime: undefined };
};

/**
 * What to call a table the lobby and the table header are showing. A sit-and-go
 * with a start time is an older **Tournament**, from before the two had separate
 * formats; everything else keeps the SDK's format display.
 */
export const displayGameFormat = (format: GameFormat | "unknown" | null | undefined, scheduledStartTime: number | undefined, fallback: (format: GameFormat | "unknown") => string): string => {
    if (!hasValue(format)) return "";
    if (format === GameFormat.SIT_AND_GO && isScheduledSng({ scheduledStartTime })) return "Tournament";
    return fallback(format);
};

/** What a fixed-buy-in table is called in the join and buy-in modals (ui#934). */
export const sitAndGoTypeLabel = (scheduledStartTime: number | undefined): string => (isScheduledSng({ scheduledStartTime }) ? "Tournament" : "Sit & Go");

/** The join modal's heading: "Tournament" for a scheduled start, "Sit & Go Tournament" otherwise. */
export const sitAndGoJoinTitle = (scheduledStartTime: number | undefined): string =>
    isScheduledSng({ scheduledStartTime }) ? "Tournament" : "Sit & Go Tournament";
