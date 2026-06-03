import * as React from "react";
import { usePlayerChipData } from "../../../../hooks/player/usePlayerChipData";
import Chip from "../../common/Chip";

interface PlayerChipDisplayProps {
    seatIndex: number;
    left: string;
    bottom: string;
    isTournament: boolean;
}

/**
 * Single-seat chip pill. Subscribes per-seat to usePlayerChipData so a WS
 * update affecting one seat re-renders only that seat's chip — see #424.
 * Memoized so prop-stable parent re-renders skip when this seat's chip
 * amount and position haven't changed.
 */
const PlayerChipDisplay: React.FC<PlayerChipDisplayProps> = React.memo(({ seatIndex, left, bottom, isTournament }) => {
    const { chipAmount } = usePlayerChipData(seatIndex);
    if (!chipAmount || chipAmount === "0") return null;
    return (
        <div className="chip-position" style={{ left, bottom }}>
            <Chip amount={chipAmount} isTournament={isTournament} />
        </div>
    );
});

PlayerChipDisplay.displayName = "PlayerChipDisplay";

export default PlayerChipDisplay;
