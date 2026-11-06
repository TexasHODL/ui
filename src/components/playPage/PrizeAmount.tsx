import React, { useId, useState } from "react";
import { prizeLabel } from "../../utils/prizeDisplay";
import "./PrizeAmount.css";

interface PrizeAmountProps {
    /** Chain prize in micro-USDC. Display only; the value is not rewritten. */
    micro: string;
}

/**
 * Floored cent label for one prize, with the exact micro-USDC amount on hover,
 * keyboard focus, and tap. A prize under one cent still reads as a prize.
 */
export const PrizeAmount: React.FC<PrizeAmountProps> = ({ micro }) => {
    const tipId = useId();
    const [open, setOpen] = useState(false);
    const label = prizeLabel(micro);
    if (!label) return <span className="prize-amount prize-amount--missing">—</span>;

    const exactText = label.hidesRemainder
        ? `Exact prize $${label.exact}. Shown cents are rounded down.`
        : `Exact prize $${label.exact}.`;

    return (
        <button
            type="button"
            className="prize-amount"
            data-testid="prize-amount"
            data-prize-floored={label.floored}
            data-prize-exact={label.exact}
            aria-expanded={open}
            aria-describedby={tipId}
            title={exactText}
            onClick={() => setOpen(current => !current)}
            onKeyDown={event => {
                if (event.key === "Escape") setOpen(false);
            }}
        >
            <span className="prize-amount__cents">${label.floored}</span>
            {label.floored === "0.00" && label.hidesRemainder && (
                <span className="prize-amount__under">Under 1¢</span>
            )}
            <span id={tipId} className="prize-amount__exact" role="tooltip">
                {exactText}
            </span>
        </button>
    );
};
