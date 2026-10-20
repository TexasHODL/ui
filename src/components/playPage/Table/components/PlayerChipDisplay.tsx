import * as React from "react";
import { usePlayerChipData } from "../../../../hooks/player/usePlayerChipData";
import { dealerSideFor, type BetSide } from "../../../../config/stageGeometry";
import Chip from "../../common/Chip";
import DealerButtonDisplay from "./DealerButtonDisplay";

interface PlayerChipDisplayProps {
    seatIndex: number;
    left: string;
    bottom: string;
    top?: string;
    /** Felt edge of the seat (from placeBetSpots). Picks the dealer button's side. */
    side?: BetSide;
    isTournament: boolean;
    /** This seat has the dealer button. It is drawn beside the bet, even with no bet. */
    isDealer?: boolean;
}

/**
 * Single-seat bet group: chip stack + amount, plus the dealer button beside it.
 * Subscribes per-seat to usePlayerChipData so a WS update affecting one seat
 * re-renders only that seat's chip — see #424.
 */
const PlayerChipDisplay: React.FC<PlayerChipDisplayProps> = React.memo(({ seatIndex, left, bottom, top, side, isTournament, isDealer = false }) => {
    const { chipAmount } = usePlayerChipData(seatIndex);
    const hasBet = !!chipAmount && chipAmount !== "0";
    if (!hasBet && !isDealer) return null;
    const centered = top !== undefined;
    return (
        <div
            className="chip-position"
            data-bet-seat={seatIndex}
            data-bet-side={side}
            style={{ left, bottom: centered ? undefined : bottom, top, transform: centered ? "translate(-50%, -50%)" : undefined }}
        >
            {hasBet ? <Chip amount={chipAmount} isTournament={isTournament} /> : <span className="bet-group-empty" aria-hidden="true" />}
            {isDealer && <DealerButtonDisplay seatIndex={seatIndex} side={dealerSideFor(side)} />}
        </div>
    );
});

PlayerChipDisplay.displayName = "PlayerChipDisplay";

export default PlayerChipDisplay;
