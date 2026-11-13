import { landscapeHandStrengthStyle } from "./handStrengthPlacement";

describe("landscapeHandStrengthStyle", () => {
    it("sits under the header at the top-left", () => {
        const style = landscapeHandStrengthStyle();
        expect(style.position).toBe("fixed");
        expect(style.top).toBe("calc(var(--mobile-chrome-end, 48px) + 4px)");
        expect(style.left).toBe("max(8px, env(safe-area-inset-left, 0px))");
        expect(style.bottom).toBeUndefined();
        expect(style.right).toBeUndefined();
        expect(style.pointerEvents).toBe("none");
        expect(style.zIndex).toBe(30);
    });
});
