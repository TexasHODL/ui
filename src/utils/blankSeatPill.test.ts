import { GameFormat } from "@block52/poker-vm-sdk";
import { showsBlankSeatPill } from "./blankSeatPill";

const CASH = "0xcash";
const DIRECTED = "0x275a79b9258009e0a1f4f4f4232cefe25262765f0a5c7c3a86040885ffec5187-t1";

describe("showsBlankSeatPill", () => {
    it("draws the pill on a single-table tournament and a directed multi-table table", () => {
        expect(showsBlankSeatPill(GameFormat.TOURNAMENT, {}, CASH)).toBe(true);
        expect(showsBlankSeatPill("tournament", {}, "0xscheduled")).toBe(true);
        expect(showsBlankSeatPill(GameFormat.CASH, { tournamentId: "0xabc" }, CASH)).toBe(true);
        expect(showsBlankSeatPill(undefined, {}, DIRECTED)).toBe(true);
        expect(showsBlankSeatPill(GameFormat.TOURNAMENT, { tournamentId: "0xabc" }, DIRECTED)).toBe(true);
    });

    it("leaves cash and sit & go on the place card", () => {
        expect(showsBlankSeatPill(GameFormat.CASH, {}, CASH)).toBe(false);
        expect(showsBlankSeatPill(GameFormat.SIT_AND_GO, {}, "0xsitandgo")).toBe(false);
        expect(showsBlankSeatPill("sit-and-go", { gameOptions: {} }, undefined)).toBe(false);
        expect(showsBlankSeatPill(undefined, undefined, undefined)).toBe(false);
        expect(showsBlankSeatPill(null, {}, CASH)).toBe(false);
    });
});
