import React from "react";
import { formatDisplayAmount } from "../../utils/numberUtils";
import { MainActionButtons } from "./MainActionButtons";
import { PotSizedBetButtons } from "./PotSizedBetButtons";
import { VerticalPillSlider } from "./VerticalPillSlider";
import type { MainActionButtonsProps, RaiseBetControlsProps } from "./types";
import "./mobileBetting.css";

export interface MobileBettingClusterProps {
    presentation: "portrait" | "landscape";
    /** Mirrors the landscape column. Ignored in portrait. */
    leftHand: boolean;
    /** Bet/raise sizing. Hidden for check/fold-only turns and short shoves. */
    showSizing: boolean;
    actions: MainActionButtonsProps;
    sizing?: RaiseBetControlsProps;
}

/** Mobile Fold / Check-Call / Raise cluster. Portrait overlays the bottom of the
 * table. Landscape is one flush column: presets on the screen edge, the pill
 * slider inboard, actions stacked underneath. */
export const MobileBettingCluster: React.FC<MobileBettingClusterProps> = ({ presentation, leftHand, showSizing, actions, sizing }) => {
    const slider = showSizing && sizing ? (
        <VerticalPillSlider
            className={presentation === "portrait" ? "portrait-raise-slider" : undefined}
            value={sizing.amount}
            min={sizing.minAmount}
            max={sizing.maxAmount}
            step={sizing.step}
            label={formatDisplayAmount(sizing.amount + sizing.displayOffset, sizing.isTournament)}
            disabled={sizing.disabled}
            invalid={sizing.isInvalid}
            onChange={sizing.onAmountChange}
            onIncrement={sizing.onIncrement}
            onDecrement={sizing.onDecrement}
        />
    ) : null;

    const presets = showSizing && sizing ? (
        <PotSizedBetButtons
            {...sizing}
            mobilePresets
            className={presentation === "landscape" ? "mobile-presets" : "mobile-presets-row"}
            onAmountSelect={sizing.onAmountChange}
        />
    ) : null;

    return (
        <div
            className={`mobile-bet mobile-bet-${presentation}${presentation === "landscape" && leftHand ? " hand-left" : ""}`}
            data-testid="mobile-bet-cluster"
            data-presentation={presentation}
            data-hand={leftHand ? "left" : "right"}
        >
            {presentation === "landscape" && showSizing && (
                <div className="mobile-bet-sizing">
                    <div className="mobile-bet-slider">{slider}</div>
                    {presets}
                </div>
            )}
            <MainActionButtons
                {...actions}
                presentation={presentation}
                raiseAccessory={presentation === "portrait" ? slider : undefined}
            />
            {presentation === "portrait" && presets}
        </div>
    );
};
