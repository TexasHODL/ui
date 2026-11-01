import { getStageOrientation, getViewportMode, isTabletPortrait } from "./stageGeometry";

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
};

describe("tablet portrait stage", () => {
    it.each([[800, 1280], [768, 1024], [820, 1180], [1032, 1376], [912, 1368]])("%ix%i uses the vertical portrait stage", (w, h) => {
        setViewport(w, h);
        expect(isTabletPortrait()).toBe(true);
        expect(getStageOrientation()).toBe("portrait");
        expect(getViewportMode().startsWith("mobile")).toBe(false);
    });

    it.each([[1024, 600], [780, 650], [1280, 720], [1920, 1080]])("%ix%i keeps the landscape stage", (w, h) => {
        setViewport(w, h);
        expect(isTabletPortrait()).toBe(false);
        expect(getStageOrientation()).toBe("landscape");
    });

    it("phones are unchanged", () => {
        setViewport(390, 844);
        expect(isTabletPortrait()).toBe(false);
        expect(getStageOrientation()).toBe("portrait");
        setViewport(844, 390);
        expect(getStageOrientation()).toBe("mobile-landscape");
    });
});