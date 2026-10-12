import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RaiseSlider } from "./RaiseSlider";
import type { RaiseSliderProps } from "./types";
import { DESKTOP_PILL_GRADIENT, desktopPillColor } from "./desktopPillTravel";

const baseProps: RaiseSliderProps = {
    value: 120,
    min: 20,
    max: 220,
    step: 20,
    formattedMax: "220",
    displayOffset: 0,
    isInvalid: false,
    disabled: false,
    isMobileLandscape: false,
    isTournament: false,
    onChange: jest.fn(),
    onIncrement: jest.fn(),
    onDecrement: jest.fn()
};

describe("RaiseSlider desktop pill", () => {
    it("renders the horizontal pill and keeps the typed amount field", () => {
        const onChange = jest.fn();
        const onIncrement = jest.fn();
        const onDecrement = jest.fn();
        render(<RaiseSlider {...baseProps} onChange={onChange} onIncrement={onIncrement} onDecrement={onDecrement} />);

        expect(screen.queryByRole("slider", { name: "Bet amount" })).toHaveAttribute("aria-orientation", "horizontal");
        expect(document.querySelector("input[type=range]")).toBeNull();
        expect(screen.getByRole("button", { name: "Decrease bet" })).toHaveClass("desktop-pill-cap-minus");
        expect(screen.getByRole("button", { name: "Increase bet" })).toHaveClass("desktop-pill-cap-plus");

        const fill = screen.getByTestId("desktop-pill-fill");
        expect(fill).toHaveStyle({ backgroundImage: DESKTOP_PILL_GRADIENT, width: "50%" });
        expect(screen.getByTestId("desktop-pill-thumb")).toHaveStyle({ background: desktopPillColor(0.5) });

        const input = screen.getByRole("textbox", { name: "Bet amount input" });
        expect(input).toHaveValue("120.00");
        fireEvent.change(input, { target: { value: "80.00" } });
        expect(onChange).toHaveBeenCalledWith(80);

        fireEvent.click(screen.getByRole("button", { name: "Increase bet" }));
        fireEvent.click(screen.getByRole("button", { name: "Decrease bet" }));
        expect(onIncrement).toHaveBeenCalledTimes(1);
        expect(onDecrement).toHaveBeenCalledTimes(1);

        const slider = screen.getByRole("slider", { name: "Bet amount" });
        fireEvent.keyDown(slider, { key: "ArrowRight" });
        fireEvent.keyDown(slider, { key: "ArrowLeft" });
        expect(onIncrement).toHaveBeenCalledTimes(2);
        expect(onDecrement).toHaveBeenCalledTimes(2);
    });

    it("keeps the compact range input on mobile landscape", () => {
        render(<RaiseSlider {...baseProps} isMobileLandscape />);
        expect(document.querySelector("input[type=range]")).not.toBeNull();
        expect(screen.queryByTestId("desktop-pill-fill")).toBeNull();
        expect(screen.queryByRole("button", { name: "Decrease bet" })).toBeNull();
    });
});
