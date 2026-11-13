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
 * The hole-card slot of a finished seat. A positive payout reads "Won $3.36"
 * where the cards were. A finisher who won nothing leaves the slot empty,
 * so the busted hand is not left face up.
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
