import React from "react";
import { RaiseSlider } from "./RaiseSlider";
import { PotSizedBetButtons } from "./PotSizedBetButtons";
import type { RaiseBetControlsProps } from "./types";
import { hasSingleBetAmount } from "../../utils/pockerActionUtils";

export const RaiseBetControls: React.FC<RaiseBetControlsProps> = ({
    amount,
    minAmount,
    maxAmount,
    formattedMaxAmount,
    displayOffset,
    totalPotMicro,
    callAmountMicro,
    isInvalid,
    isMobileLandscape,
    isTournament,
    currentRound,
    previousActions,
    disabled,
    onAmountChange,
    onIncrement,
    onDecrement,
    onAllIn,
    maxIsAllIn,
    allowBlindMultiples
}) => {
    // A fixed-limit bet or raise has one amount (ui#883): the action button
    // carries it, so there is nothing to slide or preset.
    if (hasSingleBetAmount(minAmount, maxAmount)) {
        return null;
    }
    return (
        <>
            {/* Slider Row */}
            <RaiseSlider
                value={amount}
                min={minAmount}
                max={maxAmount}
                formattedMax={formattedMaxAmount}
                displayOffset={displayOffset}
                isInvalid={isInvalid}
                disabled={disabled}
                isMobileLandscape={isMobileLandscape}
                isTournament={isTournament}
                onChange={onAmountChange}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
            />

            {/* Keep every preset available in both orientations. The mobile dock
                reserves space for this row below the table, not over the seats. */}
            <PotSizedBetButtons
                totalPotMicro={totalPotMicro}
                callAmountMicro={callAmountMicro}
                minAmount={minAmount}
                maxAmount={maxAmount}
                isTournament={isTournament}
                currentRound={currentRound}
                previousActions={previousActions}
                disabled={disabled}
                onAmountSelect={onAmountChange}
                onAllIn={onAllIn}
                maxIsAllIn={maxIsAllIn}
                allowBlindMultiples={allowBlindMultiples}
            />
        </>
    );
};
