import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RaiseSlider } from "./RaiseSlider";
import type { RaiseSliderProps } from "./types";
import { DESKTOP_PILL_GRADIENT, desktopPillColor } from "./desktopPillTravel";

const baseProps: RaiseSliderProps = {
    value: 120,
    min: 20,
    max: 220,
    formattedMax: "220",
    displayOffset: 0,
    isInvalid: false,
    disabled: false,
    isMobileLandscape: false,
    isTournament: false,
    isAllIn: false,
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
        // Arrow keys move 1¢ on the grid; the caps still step one big blind (ui#890).
        fireEvent.keyDown(slider, { key: "ArrowRight" });
        expect(onChange).toHaveBeenLastCalledWith(120.01);
        fireEvent.keyDown(slider, { key: "ArrowLeft" });
        expect(onChange).toHaveBeenLastCalledWith(119.99);
        expect(onIncrement).toHaveBeenCalledTimes(1);
        expect(onDecrement).toHaveBeenCalledTimes(1);
    });

    it("keeps the compact range input on mobile landscape", () => {
        render(<RaiseSlider {...baseProps} isMobileLandscape />);
        expect(document.querySelector("input[type=range]")).not.toBeNull();
        expect(screen.queryByTestId("desktop-pill-fill")).toBeNull();
        expect(screen.queryByRole("button", { name: "Decrease bet" })).toBeNull();
    });
});

const renderSlider = (over: Partial<RaiseSliderProps> = {}) => {
    const onChange = jest.fn();
    const props: RaiseSliderProps = {
        value: 0.1,
        min: 0.1,
        max: 1.99,
        formattedMax: "$1.99",
        displayOffset: 0,
        isInvalid: false,
        disabled: false,
        // Our desktop uses the pill; the native range input is the mobile-landscape layout.
        isMobileLandscape: true,
        isTournament: false,
        isAllIn: false,
        onChange,
        onIncrement: jest.fn(),
        onDecrement: jest.fn(),
        ...over
    };
    render(<RaiseSlider {...props} />);
    return { onChange, slider: document.querySelector("input[type=range]") as HTMLInputElement };
};

describe("RaiseSlider (ui#890)", () => {
    it("sits on the legal minimum and spans it to the max in 1¢ steps", () => {
        const { slider } = renderSlider();
        expect(slider.value).toBe("0");
        expect(slider.min).toBe("0");
        expect(slider.step).toBe("1");
        // 10¢ → $1.99 is 189 one-cent steps.
        expect(slider.max).toBe("189");
    });

    it("dragging one step moves the bet by exactly 1¢", () => {
        const { slider, onChange } = renderSlider();
        fireEvent.change(slider, { target: { value: "1" } });
        expect(onChange).toHaveBeenLastCalledWith(0.11);
        fireEvent.change(slider, { target: { value: "3" } });
        expect(onChange).toHaveBeenLastCalledWith(0.13);
    });

    it("the far right is exactly the max, even for an uneven stack", () => {
        const { slider, onChange } = renderSlider({ min: 0.04, max: 1.234567 });
        fireEvent.change(slider, { target: { value: slider.max } });
        expect(onChange).toHaveBeenLastCalledWith(1.234567);
    });

    it("tournaments step whole chips", () => {
        const { slider, onChange } = renderSlider({ value: 100, min: 100, max: 1500, isTournament: true, formattedMax: "1,500" });
        expect(slider.max).toBe("1400");
        fireEvent.change(slider, { target: { value: "1" } });
        expect(onChange).toHaveBeenLastCalledWith(101);
    });

    it("shows the ALL-IN tag only when the amount is the whole stack", () => {
        renderSlider();
        expect(screen.queryByText("ALL-IN")).not.toBeInTheDocument();
    });

    it("shows the ALL-IN tag at an all-in max", () => {
        renderSlider({ value: 1.99, isAllIn: true });
        expect(screen.getByText("ALL-IN")).toBeInTheDocument();
    });
});

describe("RaiseSlider desktop pill on the 1¢ grid (ui#890)", () => {
    const rect = { left: 0, width: 100, top: 0, height: 10, right: 100, bottom: 10, x: 0, y: 0, toJSON: () => ({}) };
    const drag = (clientX: number) => {
        const track = screen.getByRole("slider", { name: "Bet amount" });
        const rail = track.querySelector(".desktop-pill-rail") as HTMLElement;
        rail.getBoundingClientRect = () => rect as DOMRect;
        // jsdom has no PointerEvent, so send a MouseEvent typed as pointerdown to carry clientX.
        fireEvent(track, new MouseEvent("pointerdown", { bubbles: true, clientX }));
    };

    it("the far right is exactly the max, even for an uneven stack", () => {
        const onChange = jest.fn();
        render(<RaiseSlider {...baseProps} value={0.04} min={0.04} max={1.234567} onChange={onChange} />);
        drag(100);
        expect(onChange).toHaveBeenLastCalledWith(1.234567);
        drag(0);
        expect(onChange).toHaveBeenLastCalledWith(0.04);
    });

    it("drags land on whole cents", () => {
        const onChange = jest.fn();
        render(<RaiseSlider {...baseProps} value={0.1} min={0.1} max={1.99} onChange={onChange} />);
        drag(50);
        // 189 steps * 0.5 = 94.5 -> step 95 -> $1.05
        expect(onChange).toHaveBeenLastCalledWith(1.05);
    });

    it("shows the ALL-IN tag at an all-in max", () => {
        render(<RaiseSlider {...baseProps} value={220} isAllIn />);
        expect(screen.getByText("ALL-IN")).toBeInTheDocument();
    });
});
