import React from "react";
import { formatPotLabel } from "../../../../utils/potTextUtils";
import { PotPill } from "./PotPill";

interface MainPotDisplayProps {
    /** Formatted pot size, for the text label. */
    amount: string;
    /** Raw pot size (micro-USDC for cash, chips for tournaments), for the chip stack. */
    rawAmount: bigint;
    isTournamentStyle: boolean;
    /** "Pot as Chips" setting (ui#772): a chip pill instead of the "Main Pot: $x" text. */
    asChips: boolean;
}

export const MainPotDisplay: React.FC<MainPotDisplayProps> = ({ amount, rawAmount, isTournamentStyle, asChips }) => {
    if (asChips) {
        return (
            <div className="pot-chips-secondary">
                <PotPill amount={rawAmount} label="Main Pot" isTournament={isTournamentStyle} />
            </div>
        );
    }
    return (
        <div className="pot-display-secondary">
            {formatPotLabel("Main Pot", amount, isTournamentStyle)}
        </div>
    );
};
