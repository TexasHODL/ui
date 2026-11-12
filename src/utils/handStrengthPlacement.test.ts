import { landscapeHandStrengthStyle } from "./handStrengthPlacement";

describe("landscapeHandStrengthStyle", () => {
    it("sits in the lower-left when the action column is on the right", () => {
        const style = landscapeHandStrengthStyle(false);
        expect(style.bottom).toBe("max(8px, env(safe-area-inset-bottom, 0px))");
        expect(style.left).toBe("max(8px, env(safe-area-inset-left, 0px))");
        expect(style.right).toBe("auto");
        expect(style.top).toBe("auto");
        expect(style.position).toBe("fixed");
    });

    it("sits in the lower-right when left-hand mode puts the action column on the left", () => {
        const style = landscapeHandStrengthStyle(true);
        expect(style.bottom).toBe("max(8px, env(safe-area-inset-bottom, 0px))");
        expect(style.right).toBe("max(8px, env(safe-area-inset-right, 0px))");
        expect(style.left).toBe("auto");
        expect(style.top).toBe("auto");
    });
});
