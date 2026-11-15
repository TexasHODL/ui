import { showsBlankSeatPill } from "./blankSeatPill";

const CASH = "0xcash";
const DIRECTED = "0x275a79b9258009e0a1f4f4f4232cefe25262765f0a5c7c3a86040885ffec5187-t1";

describe("showsBlankSeatPill", () => {
    it("is only a directed multi-table table", () => {
        expect(showsBlankSeatPill({ tournamentId: "0xabc" }, CASH)).toBe(true);
        expect(showsBlankSeatPill({}, DIRECTED)).toBe(true);
        expect(showsBlankSeatPill({ tournamentId: "0xabc" }, DIRECTED)).toBe(true);
    });

    it("leaves cash, sit & go and a single-table tournament on the place card", () => {
        expect(showsBlankSeatPill({}, CASH)).toBe(false);
        expect(showsBlankSeatPill({ gameOptions: {} }, undefined)).toBe(false);
        expect(showsBlankSeatPill(undefined, undefined)).toBe(false);
        expect(showsBlankSeatPill({}, "0xsitandgo")).toBe(false);
    });
});
