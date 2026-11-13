import React from "react";
import { finishedSeatDisplay } from "../../../utils/finishedSeatDisplay";
import { hasValue } from "../../../utils/guards";
import { PrizeAmount } from "../PrizeAmount";
import { FitText } from "../common/FitText";
import "./FinishedSeatCards.css";

interface FinishedSeatCardsProps {
    place: number;
    /** Raw payout from results[], USDC micro-units. */
    payout: string;
}

/**
 * The hole-card slot after a later hand has been dealt. A positive payout
 * reads "Won $3.36" where the cards were. On the finishing hand itself the
 * cards stay up and the payout uses the action banner instead.
 */
export const FinishedSeatCards: React.FC<FinishedSeatCardsProps> = ({ place, payout }) => {
    const { payoutMicro } = finishedSeatDisplay(place, payout);
    return (
        <div className="finished-seat-cards" data-testid="finished-seat-cards">
            {hasValue(payoutMicro) && (
                <FitText className="finished-seat-payout">
                    <span data-testid="finished-seat-payout">
                        Won <PrizeAmount micro={payoutMicro} />
                    </span>
                </FitText>
            )}
        </div>
    );
};
