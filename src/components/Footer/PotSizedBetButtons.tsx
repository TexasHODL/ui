import React from "react";
import { calculatePotBetWithVariation, type PotBetVariation } from "../../utils/calculatePotBetAmount";
import { highestPreflopContribution, preflopPresetAmount, showPreflopMultiples, UNOPENED_PREFLOP_PRESETS } from "../../utils/preflopPresets";
import { microBigIntToUsdc, roundMicroToCent } from "../../constants/currency";
import { presetExceedsMax } from "../../utils/potPresetLimits";
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
                            className="btn-pot px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full min-w-0 whitespace-nowrap border shadow-md text-[10px] lg:text-xs transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                            onClick={() => onAmountSelect(minAmount)}
                            disabled={disabled || cannotAffordMin}
                        >
                            {label}
                        </button>
                    );
                }
                const amount = presetAmount(micro!);
                // Grey out rather than silently resize: below the legal minimum, or
                // above the most the player may put in (ui#857) — a short stack
                // shoves with ALL-IN, not a "Pot" button.
                const belowMin = amount < minAmount;
                const aboveMax = presetExceedsMax(micro!, maxAmount, isTournament);
                const aboveMaxTitle = maxIsAllIn ? "More than your stack" : "More than the pot-limit allows";
                return (
                    <button
                        key={label}
                        className="btn-pot px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full min-w-0 whitespace-nowrap border shadow-md text-[10px] lg:text-xs transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                        // Capped only for cent rounding: a pot-limit Pot whose true size
                        // fits the cap can round a fraction of a cent above it.
                        onClick={() => onAmountSelect(Math.min(amount, maxAmount))}
                        disabled={disabled || cannotAffordMin || belowMin || aboveMax}
                        title={belowMin ? "Below the minimum bet" : aboveMax ? aboveMaxTitle : undefined}
                    >
                        {label}
                    </button>
                );
            })}

            <button
                className="btn-all-in px-1 lg:px-2 py-1 lg:py-1.5 rounded-lg w-full min-w-0 whitespace-nowrap border shadow-md text-[10px] lg:text-xs transition-all duration-200 font-medium transform active:scale-105"
                onClick={onAllIn}
                // At pot-limit, Pot already is the max: ALL-IN only lights up when the
                // whole stack is less than a pot-sized bet (ui#857), never as "MAX".
                disabled={disabled || !maxIsAllIn}
                title={maxIsAllIn ? undefined : "Pot is the most you can bet at pot-limit"}
            >
                {mobilePresets ? "All-in" : "ALL-IN"}
            </button>
        </div>
    );
};
