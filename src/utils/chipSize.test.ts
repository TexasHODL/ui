import { chipSizeForViewport, dealerButtonSizeForViewport, CHIP_SIZE, CHIP_SIZE_MOBILE } from "./chipSize";

describe("dealerButtonSizeForViewport", () => {
    const setViewport = (width: number, height: number) => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    };

    it("is 20% larger than a chip on desktop (34 vs 28)", () => {
        setViewport(1280, 800);
        expect(chipSizeForViewport()).toBe(CHIP_SIZE);
        expect(dealerButtonSizeForViewport()).toBe(Math.round(CHIP_SIZE * 1.2));
        expect(dealerButtonSizeForViewport()).toBe(34);
    });

    it("is 20% larger than a chip on mobile (38 vs 32)", () => {
        setViewport(390, 844);
        expect(chipSizeForViewport()).toBe(CHIP_SIZE_MOBILE);
        expect(dealerButtonSizeForViewport()).toBe(Math.round(CHIP_SIZE_MOBILE * 1.2));
        expect(dealerButtonSizeForViewport()).toBe(38);
    });
});
