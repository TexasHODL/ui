import React from "react";
import { formatFlooredPrizeDollars, parsePrizeMicro } from "../../utils/prizeDisplay";
import { hasValue } from "@block52/ui-sdk/helpers";

interface PrizeAmountProps {
    /** Chain prize in micro-USDC. Display only; the value is not rewritten. */
    micro: string;
}

/** Plain two-decimal prize label, rounded down. The chain amount is not rewritten. */
export const PrizeAmount: React.FC<PrizeAmountProps> = ({ micro }) => {
    const amount = parsePrizeMicro(micro);
    if (!hasValue(amount)) return <span data-testid="prize-amount">—</span>;
    return <span data-testid="prize-amount">${formatFlooredPrizeDollars(amount)}</span>;
};
