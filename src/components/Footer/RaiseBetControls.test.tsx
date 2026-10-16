import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import { RaiseBetControls } from "./RaiseBetControls";
import type { RaiseBetControlsProps } from "./types";

const baseProps: RaiseBetControlsProps = {
    amount: 320, minAmount: 320, maxAmount: 1390, formattedMaxAmount: "1390",
    step: 320, displayOffset: 0, totalPotMicro: 1280n, callAmountMicro: 0n,
    isInvalid: false, isMobileLandscape: true,
    isTournament: true, currentRound: TexasHoldemRound.FLOP, previousActions: [],
    disabled: false, onAmountChange: jest.fn(), onIncrement: jest.fn(),
    onDecrement: jest.fn(), onAllIn: jest.fn(), maxIsAllIn: true
};

describe("RaiseBetControls presets", () => {
    it.each([true, false])("keeps all presets available with landscape=%s", isMobileLandscape => {
        const onAmountChange = jest.fn();
        const onAllIn = jest.fn();
        render(<RaiseBetControls {...baseProps} isMobileLandscape={isMobileLandscape} onAmountChange={onAmountChange} onAllIn={onAllIn} />);
        for (const [label, amount] of [["1/4 Pot", 320], ["1/2 Pot", 640], ["3/4 Pot", 960], ["Pot", 1280]] as const) {
            fireEvent.click(screen.getByRole("button", { name: label }));
            expect(onAmountChange).toHaveBeenLastCalledWith(amount);
        }
        expect(onAllIn).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "ALL-IN" }));
        expect(onAllIn).toHaveBeenCalledTimes(1);
    });

    it.each([true, false])("retains below-minimum preset gating with landscape=%s", isMobileLandscape => {
        const onAmountChange = jest.fn();
        render(<RaiseBetControls {...baseProps} minAmount={640} isMobileLandscape={isMobileLandscape} onAmountChange={onAmountChange} />);
        const quarterPot = screen.getByRole("button", { name: "1/4 Pot" });
        expect(quarterPot).toBeDisabled();
        fireEvent.click(quarterPot);
        expect(onAmountChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "1/2 Pot" }));
        expect(onAmountChange).toHaveBeenLastCalledWith(640);
    });

    it("keeps presets disabled when actions are unavailable in landscape", () => {
        const onAmountChange = jest.fn();
        const onAllIn = jest.fn();
        render(<RaiseBetControls {...baseProps} disabled onAmountChange={onAmountChange} onAllIn={onAllIn} />);
        for (const label of ["1/4 Pot", "1/2 Pot", "3/4 Pot", "Pot", "ALL-IN"]) {
            const button = screen.getByRole("button", { name: label });
            expect(button).toBeDisabled();
            fireEvent.click(button);
        }
        expect(onAmountChange).not.toHaveBeenCalled();
        expect(onAllIn).not.toHaveBeenCalled();
    });
});
