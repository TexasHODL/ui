import { avatarInsetPx } from "./useAvatarEdgeInset";

describe("avatarInsetPx", () => {
    const bound = { left: 0, right: 1024 };

    it("leaves the avatar alone when it fits", () => {
        expect(avatarInsetPx({ left: 100, right: 220 }, bound, 40)).toBe(0);
    });

    it("nudges the seat in just enough when it would be clipped", () => {
        // 1000 + 40 = 1040 -> 16px over, plus a 2px margin
        expect(avatarInsetPx({ left: 880, right: 1000 }, bound, 40)).toBe(18);
    });

    it("converts screen px to CSS px when the table is scaled", () => {
        // 0.5 scale: overhang is 20 screen px, 1000 + 20 - 1010 = 10 screen px = 20 CSS px
        expect(avatarInsetPx({ left: 880, right: 1000 }, { left: 0, right: 1010 }, 40, 0.5)).toBe(22);
    });

    it("nudges by the full overflow for a pill hanging past the edge", () => {
        expect(avatarInsetPx({ left: 900, right: 1100 }, bound, 40)).toBe(118);
    });

    it("respects a clipping container narrower than the viewport", () => {
        expect(avatarInsetPx({ left: 600, right: 700 }, { left: 0, right: 720 }, 40)).toBe(22);
    });
});