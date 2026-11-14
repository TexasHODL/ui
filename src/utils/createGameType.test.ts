import { GameFormat, formatGameFormatDisplay } from "@block52/poker-vm-sdk";
import { CREATE_GAME_TYPES, createdTableFormat, createGameTypeFormat, createGameTypeLabel, displayGameFormat, isMultiTableCreateType, isScheduledCreateType, sitAndGoJoinTitle, sitAndGoTypeLabel, toCreateGameType } from "./createGameType";

describe("createGameType (ui#823)", () => {
    it("offers the three types a player can create", () => {
        expect(CREATE_GAME_TYPES).toEqual(["sit-and-go", "cash", "tournament", "multi-table"]);
        expect(CREATE_GAME_TYPES.map(createGameTypeLabel)).toEqual(["Sit & Go", "Cash Game", "Tournament", "Multi-table tournament"]);
    });

    it("coerces select values and rejects anything else", () => {
        expect(toCreateGameType("tournament")).toBe("tournament");
        expect(toCreateGameType("cash")).toBe("cash");
        expect(toCreateGameType("sit-and-go")).toBe("sit-and-go");
        expect(toCreateGameType("multi-table")).toBe("multi-table");
        expect(toCreateGameType("mtt")).toBeUndefined();
        expect(toCreateGameType(undefined)).toBeUndefined();
    });

    it("creates each type as its own format on chain (poker-vm#2776)", () => {
        expect(createGameTypeFormat("tournament")).toBe(GameFormat.TOURNAMENT);
        expect(createGameTypeFormat("sit-and-go")).toBe(GameFormat.SIT_AND_GO);
        expect(createGameTypeFormat("cash")).toBe(GameFormat.CASH);
    });

    it("treats a multi-table tournament as its own create option, not a table", () => {
        expect(isMultiTableCreateType("multi-table")).toBe(true);
        expect(isMultiTableCreateType("tournament")).toBe(false);
        expect(isScheduledCreateType("multi-table")).toBe(false);
        expect(() => createdTableFormat("multi-table", false, undefined)).toThrow(/createTournament/);
    });

    it("only a Tournament carries a start time", () => {
        expect(isScheduledCreateType("tournament")).toBe(true);
        expect(isScheduledCreateType("sit-and-go")).toBe(false);
        expect(isScheduledCreateType("cash")).toBe(false);
    });

    describe("createdTableFormat (SDK 1.24)", () => {
        const start = 1_700_000_000;

        it("keeps a plain Sit & Go as sit-and-go with no start time", () => {
            expect(createdTableFormat("sit-and-go", false, start)).toEqual({ format: GameFormat.SIT_AND_GO, startTime: undefined });
            expect(createdTableFormat("sit-and-go", false, undefined)).toEqual({ format: GameFormat.SIT_AND_GO, startTime: undefined });
        });

        it("creates a scheduled Sit & Go as a tournament that holds for its start time", () => {
            expect(createdTableFormat("sit-and-go", true, start)).toEqual({ format: GameFormat.TOURNAMENT, startTime: start });
        });

        it("creates a Tournament as a tournament with its start time", () => {
            expect(createdTableFormat("tournament", false, start)).toEqual({ format: GameFormat.TOURNAMENT, startTime: start });
        });

        it("leaves a cash game as cash, even if a start time was typed", () => {
            expect(createdTableFormat("cash", true, start)).toEqual({ format: GameFormat.CASH, startTime: undefined });
        });
    });

    describe("displayGameFormat", () => {
        it("calls a scheduled sit-and-go a Tournament", () => {
            expect(displayGameFormat(GameFormat.SIT_AND_GO, 1_700_000_000_000, formatGameFormatDisplay)).toBe("Tournament");
        });

        it("leaves an unscheduled sit-and-go, a cash game and a legacy tournament to the SDK label", () => {
            expect(displayGameFormat(GameFormat.SIT_AND_GO, undefined, formatGameFormatDisplay)).toBe(formatGameFormatDisplay(GameFormat.SIT_AND_GO));
            expect(displayGameFormat(GameFormat.TOURNAMENT, 1_700_000_000_000, formatGameFormatDisplay)).toBe("Tournament");
            expect(displayGameFormat(GameFormat.SIT_AND_GO, 0, formatGameFormatDisplay)).toBe(formatGameFormatDisplay(GameFormat.SIT_AND_GO));
            expect(displayGameFormat(GameFormat.CASH, 1_700_000_000_000, formatGameFormatDisplay)).toBe(formatGameFormatDisplay(GameFormat.CASH));
            expect(displayGameFormat(GameFormat.TOURNAMENT, undefined, formatGameFormatDisplay)).toBe(formatGameFormatDisplay(GameFormat.TOURNAMENT));
        });

        it("is empty with no format", () => {
            expect(displayGameFormat(null, 1, formatGameFormatDisplay)).toBe("");
            expect(displayGameFormat(undefined, 1, formatGameFormatDisplay)).toBe("");
        });
    });

    describe("modal labels (ui#934)", () => {
        it("calls a scheduled sit-and-go a Tournament", () => {
            expect(sitAndGoTypeLabel(1_700_000_000_000)).toBe("Tournament");
            expect(sitAndGoJoinTitle(1_700_000_000_000)).toBe("Tournament");
        });

        it("keeps Sit & Go for a table that starts when full", () => {
            expect(sitAndGoTypeLabel(undefined)).toBe("Sit & Go");
            expect(sitAndGoTypeLabel(0)).toBe("Sit & Go");
            expect(sitAndGoJoinTitle(undefined)).toBe("Sit & Go Tournament");
            expect(sitAndGoJoinTitle(0)).toBe("Sit & Go Tournament");
        });
    });
});
