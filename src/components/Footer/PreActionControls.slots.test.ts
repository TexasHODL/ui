import { preActionSlots } from "./preActionSlots";

// Slots: [FOLD, CHECK, CALL, RAISE] — bottom-up in the mobile landscape column,
// left-to-right in the desktop action row. RAISE is always empty.
describe("preActionSlots", () => {
    it("owing a bet: Fold on FOLD, Call Any on CHECK, Call $x on CALL", () => {
        expect(preActionSlots(["fold", "call-exact", "call-any"])).toEqual(["fold", "call-any", "call-exact", null]);
    });
    it("free check: Check on FOLD, Check/Fold on CHECK, Call Any on CALL", () => {
        expect(preActionSlots(["check-fold", "check", "call-any"])).toEqual(["check", "check-fold", "call-any", null]);
    });
    it("lone Check/Fold sits on CHECK", () => {
        expect(preActionSlots(["check-fold"])).toEqual([null, "check-fold", null, null]);
    });
    it("all-in call: Fold on FOLD, All In on CALL", () => {
        expect(preActionSlots(["fold", "all-in"])).toEqual(["fold", null, "all-in", null]);
    });
    it("never uses the RAISE slot and never doubles up a slot", () => {
        for (const b of [["fold", "call-exact", "call-any"], ["check-fold", "check", "call-any"], ["check-fold"], ["fold", "all-in"]] as const) {
            const slots = preActionSlots([...b]);
            expect(slots).toHaveLength(4);
            expect(slots[3]).toBeNull();
            expect(slots.filter(Boolean).sort()).toEqual([...b].sort());
        }
    });
});
