import { landscapePreActionSlots } from "./PreActionControls";

describe("landscapePreActionSlots", () => {
    it("owing a bet: Fold on FOLD, Call $x and Call Any share CALL", () => {
        expect(landscapePreActionSlots(["fold", "call-exact", "call-any"])).toEqual({ fold: ["fold"], passive: ["call-exact", "call-any"] });
    });
    it("can check: Check/Fold and Check on CHECK, Call Any on the fold slot (never RAISE)", () => {
        expect(landscapePreActionSlots(["check-fold", "check", "call-any"])).toEqual({ fold: ["call-any"], passive: ["check-fold", "check"] });
    });
    it("lone Check/Fold sits on CHECK", () => {
        expect(landscapePreActionSlots(["check-fold"])).toEqual({ fold: [], passive: ["check-fold"] });
    });
    it("all-in call: Fold on FOLD, All In on CALL", () => {
        expect(landscapePreActionSlots(["fold", "all-in"])).toEqual({ fold: ["fold"], passive: ["all-in"] });
    });
});
