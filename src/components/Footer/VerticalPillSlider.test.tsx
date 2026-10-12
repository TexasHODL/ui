import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { VerticalPillSlider } from "./VerticalPillSlider";
import { SLIDER_TRAVEL_GRADIENT } from "./sliderTravel";

describe("VerticalPillSlider", () => {
    it("paints the fill with the travel gradient and colors the thumb for the current bet", () => {
        render(
            <VerticalPillSlider
                value={20}
                min={20}
                max={220}
                step={20}
                label="20"
                onChange={jest.fn()}
                onIncrement={jest.fn()}
                onDecrement={jest.fn()}
            />
        );
        expect(screen.getByTestId("pill-fill").getAttribute("style")).toContain(SLIDER_TRAVEL_GRADIENT);
        expect(screen.getByTestId("pill-thumb").getAttribute("style")).toContain("rgb(240, 43, 198)");
        expect(screen.getByRole("button", { name: "Increase bet" })).toHaveClass("pill-cap-plus");
        expect(screen.getByRole("button", { name: "Decrease bet" })).toHaveClass("pill-cap-minus");
    });

    it("steps from the existing increment and decrement handlers", () => {
        const onIncrement = jest.fn();
        const onDecrement = jest.fn();
        render(
            <VerticalPillSlider
                value={100}
                min={20}
                max={220}
                step={20}
                label="100"
                onChange={jest.fn()}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "Increase bet" }));
        fireEvent.click(screen.getByRole("button", { name: "Decrease bet" }));
        expect(onIncrement).toHaveBeenCalledTimes(1);
        expect(onDecrement).toHaveBeenCalledTimes(1);
    });

    it("exposes the travel as a vertical slider", () => {
        render(
            <VerticalPillSlider
                value={100}
                min={20}
                max={220}
                step={20}
                label="100"
                onChange={jest.fn()}
                onIncrement={jest.fn()}
                onDecrement={jest.fn()}
            />
        );
        const track = screen.getByRole("slider", { name: "Bet amount" });
        expect(track).toHaveAttribute("aria-orientation", "vertical");
        expect(track).toHaveAttribute("aria-valuenow", "100");
        expect(track).toHaveAttribute("aria-valuemin", "20");
        expect(track).toHaveAttribute("aria-valuemax", "220");
    });
});
