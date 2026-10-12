import { betFromHorizontalTravel, DESKTOP_PILL_GRADIENT, desktopPillColor } from "./desktopPillTravel";

describe("desktop pill travel", () => {
    it("runs pink at the low end to orange at the high end", () => {
        expect(DESKTOP_PILL_GRADIENT).toBe("linear-gradient(to right, #f02bc6, #ff4a83 48%, #ff9717)");
        expect(desktopPillColor(0)).toBe("rgb(240, 43, 198)");
        expect(desktopPillColor(0.48)).toBe("rgb(255, 74, 131)");
        expect(desktopPillColor(1)).toBe("rgb(255, 151, 23)");
    });

    it("maps the left of the travel to the min and the right to the max, on the step", () => {
        expect(betFromHorizontalTravel(0, 0, 100, 20, 220, 20)).toBe(20);
        expect(betFromHorizontalTravel(100, 0, 100, 20, 220, 20)).toBe(220);
        expect(betFromHorizontalTravel(50, 0, 100, 20, 220, 20)).toBe(120);
    });
});
