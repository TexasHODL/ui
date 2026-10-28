import { preActionSlots } from "./preActionSlots";

// Slots: [FOLD, CHECK, CALL, RAISE] — bottom-up in the mobile landscape column,
// left-to-right in the desktop action row. RAISE is always empty.
describe("preActionSlots", () => {
    it("owing a bet: Fold on FOLD, Call $x on CHECK, Call Any on CALL", () => {
        expect(preActionSlots(["fold", "call-exact", "call-any"])).toEqual(["fold", "call-exact", "call-any", null]);
    });
    it("free check: Check/Fold on FOLD, Check on CHECK, Call Any on CALL", () => {
        expect(preActionSlots(["check-fold", "check", "call-any"])).toEqual(["check-fold", "check", "call-any", null]);
    });
    it("Call $x alone sits on CALL", () => {
        expect(preActionSlots(["fold", "call-exact"])).toEqual(["fold", null, "call-exact", null]);
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
