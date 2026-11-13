import { provablyFairPanelAnchor } from "./provablyFairPanelAnchor";

describe("provablyFairPanelAnchor", () => {
    it("aligns the panel's right edge with the shield and sits below the banner", () => {
        const anchor = provablyFairPanelAnchor(1400, 70, 118, 1440, 320);
        expect(anchor.right).toBe(40);
        expect(anchor.top).toBe(126);
    });

    it("keeps an inset when the shield is flush with the screen edge", () => {
        const anchor = provablyFairPanelAnchor(1440, 80, 70, 1440, 320);
        expect(anchor.right).toBe(8);
        expect(anchor.top).toBe(88);
    });

    it("slides the panel in when aligning to the shield would leave the screen", () => {
        const anchor = provablyFairPanelAnchor(100, 50, 48, 390, 320);
        expect(anchor.right).toBe(62);
        expect(anchor.top).toBe(58);
    });

    it("prefers the banner bottom when the shield sits inside a taller header", () => {
        const anchor = provablyFairPanelAnchor(900, 40, 120, 1024, 320);
        expect(anchor.top).toBe(128);
        expect(anchor.right).toBe(124);
    });
});
