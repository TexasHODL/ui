import React from "react";
import { calculatePotBetWithVariation, type PotBetVariation } from "../../utils/calculatePotBetAmount";
import { highestPreflopContribution, preflopPresetAmount, showPreflopMultiples, UNOPENED_PREFLOP_PRESETS } from "../../utils/preflopPresets";
import { microBigIntToUsdc, roundMicroToCent } from "../../constants/currency";
import type { PotSizedBetButtonsProps } from "./types";

const DESKTOP_POT_FRACTIONS: { label: string; variation: PotBetVariation }[] = [
    { label: "1/4 Pot", variation: "1/4" },
    { label: "1/2 Pot", variation: "1/2" },
    { label: "3/4 Pot", variation: "3/4" }
];

const MOBILE_POT_FRACTIONS: { label: string; variation: PotBetVariation | "min" }[] = [
    { label: "Min", variation: "min" },
    { label: "1/2", variation: "1/2" },
    { label: "3/4", variation: "3/4" },
    { label: "Pot", variation: "1" }
];

export const PotSizedBetButtons: React.FC<PotSizedBetButtonsProps> = ({
    totalPotMicro,
    callAmountMicro,
    minAmount,
    maxAmount,
    isTournament,
    currentRound,
    previousActions,
    disabled,
    onAmountSelect,
    onAllIn,
    mobilePresets = false,
    className,
    maxIsAllIn,
    allowBlindMultiples
}) => {
    const potBetMicro = (variation: PotBetVariation): bigint =>
        calculatePotBetWithVariation(
            {
                currentRound,
                previousActions,
                callAmount: callAmountMicro,
                pot: totalPotMicro
            },
            variation
        );

    // Opening raise pre-flop: big-blind multiples (2x/2.5x/3x/5x, ui#751). Facing a
    // raise or any later street: pot fractions. Omaha / pot-limit never open in blinds.
    const useMultiples = allowBlindMultiples && showPreflopMultiples(currentRound, previousActions);
    const highest = useMultiples ? highestPreflopContribution(previousActions) : 0n;

    type Preset = { label: string; micro: bigint | null; isMin?: boolean };
    let presets: Preset[];
    if (useMultiples) {
        presets = UNOPENED_PREFLOP_PRESETS.map(({ label, multiple }) => ({
            label,
            micro: preflopPresetAmount(highest, callAmountMicro, multiple)
        }));
    } else if (mobilePresets) {
        presets = MOBILE_POT_FRACTIONS.map(({ label, variation }) =>
            variation === "min"
                ? { label, micro: null, isMin: true }
                : { label, micro: potBetMicro(variation) }
        );
    } else {
        presets = [
            ...DESKTOP_POT_FRACTIONS.map(({ label, variation }) => ({ label, micro: potBetMicro(variation) })),
            { label: "Pot", micro: potBetMicro("1") }
        ];
    }

    const presetAmount = (micro: bigint): number => (isTournament ? Number(micro) : microBigIntToUsdc(roundMicroToCent(micro)));

    // A short stack that can't afford the legal minimum can only shove, via ALL-IN.
    const cannotAffordMin = minAmount > maxAmount;

    return (
        <div className={className ?? "flex justify-between gap-1 lg:gap-2 mb-1"}>
            {presets.map(({ label, micro, isMin }) => {
                if (isMin) {
                    return (
                        <button
                            key={label}
                            className="btn-pot px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full border shadow-md text-[10px] lg:text-xs transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                            onClick={() => onAmountSelect(minAmount)}
                            disabled={disabled || cannotAffordMin}
                        >
                            {label}
                        </button>
                    );
                }
                const amount = presetAmount(micro!);
                // Each preset is judged on its own: one that would bet less than the
                // legal minimum is greyed out rather than silently resized.
                const belowMin = amount < minAmount;
                return (
                    <button
                        key={label}
                        className="btn-pot px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full border shadow-md text-[10px] lg:text-xs transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                        onClick={() => onAmountSelect(Math.min(amount, maxAmount))}
                        disabled={disabled || cannotAffordMin || belowMin}
                        title={belowMin ? "Below the minimum bet" : undefined}
                    >
                        {label}
                    </button>
                );
            })}

            <button
                className="btn-all-in px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full border shadow-md text-[10px] lg:text-xs transition-all duration-200 font-medium transform active:scale-105"
                onClick={onAllIn}
                disabled={disabled}
                title={maxIsAllIn ? undefined : "The most the pot-limit allows"}
            >
                {!maxIsAllIn ? "MAX" : mobilePresets ? "All-in" : "ALL-IN"}
            </button>
        </div>
    );
};
