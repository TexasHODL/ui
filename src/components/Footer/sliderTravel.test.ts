import { betFromTravel, SLIDER_TRAVEL_GRADIENT, sliderTravelColor } from "./sliderTravel";

describe("betFromTravel", () => {
    it("maps the top of the travel to the max and the bottom to the min, on the step", () => {
        expect(betFromTravel(0, 0, 100, 20, 220, 20)).toBe(220);
        expect(betFromTravel(100, 0, 100, 20, 220, 20)).toBe(20);
        expect(betFromTravel(50, 0, 100, 20, 220, 20)).toBe(120);
    });
});

describe("slider travel gradient", () => {
    it("runs pink at the low end to orange at the high end", () => {
        expect(SLIDER_TRAVEL_GRADIENT).toBe("linear-gradient(to top, #f02bc6, #ff4a83 48%, #ff9717)");
        expect(sliderTravelColor(0)).toBe("rgb(240, 43, 198)");
        expect(sliderTravelColor(1)).toBe("rgb(255, 151, 23)");
        expect(sliderTravelColor(0.48)).toBe("rgb(255, 74, 131)");
    });
});
