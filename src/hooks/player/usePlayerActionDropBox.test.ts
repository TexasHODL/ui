import { formatActionAmount } from "./usePlayerActionDropBox";

// Issue #487: the action badge under a player's avatar showed "$0.00" on Sit & Go.
// Tournament amounts are raw whole chips; cash amounts are USDC micro-units (÷10^6).
describe("formatActionAmount", () => {
    describe("tournament / SNG (raw whole chips)", () => {
        it("should render small chip bets as whole chips, never $0.00", () => {
            // The exact bug: "5" chips formatted as micro-USDC rounds to "$0.00".
            expect(formatActionAmount("5", true)).toBe(" 5");
        });

        it("should render larger chip amounts with comma separators and no $", () => {
            expect(formatActionAmount("1500", true)).toBe(" 1,500");
            expect(formatActionAmount("1000000", true)).toBe(" 1,000,000");
        });

        it("should return empty string for zero / blank / undefined amounts", () => {
            expect(formatActionAmount("0", true)).toBe("");
            expect(formatActionAmount("", true)).toBe("");
            expect(formatActionAmount(undefined, true)).toBe("");
        });
    });

    describe("cash (USDC micro-units)", () => {
        it("should convert micro-units to a dollar amount", () => {
            expect(formatActionAmount("5000000", false)).toBe(" $5.00");
            expect(formatActionAmount("20000", false)).toBe(" $0.02");
        });

        it("should return empty string for zero / blank / undefined amounts", () => {
            expect(formatActionAmount("0", false)).toBe("");
            expect(formatActionAmount("", false)).toBe("");
            expect(formatActionAmount(undefined, false)).toBe("");
        });
    });

    it("should not crash on non-numeric input", () => {
        expect(formatActionAmount("abc", true)).toBe("");
        expect(formatActionAmount("abc", false)).toBe("");
    });
});
