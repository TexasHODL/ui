import * as React from "react";
import { usePlayerChipData } from "../../../../hooks/player/usePlayerChipData";
import Chip from "../../common/Chip";

interface PlayerChipDisplayProps {
    seatIndex: number;
    left: string;
    bottom: string;
    top?: string;
    isTournament: boolean;
}

/**
 * Single-seat chip pill. Subscribes per-seat to usePlayerChipData so a WS
 * update affecting one seat re-renders only that seat's chip — see #424.
 * Memoized so prop-stable parent re-renders skip when this seat's chip
 * amount and position haven't changed.
 */
const PlayerChipDisplay: React.FC<PlayerChipDisplayProps> = React.memo(({ seatIndex, left, bottom, top, isTournament }) => {
    const { chipAmount } = usePlayerChipData(seatIndex);
    if (!chipAmount || chipAmount === "0") return null;
    // Mobile centres the pile on a table-space point just inside the rail.
    // Desktop keeps the bottom/left anchor the geometry offsets were tuned for.
    const centered = top !== undefined;
    return (
        <div className="chip-position" style={{ left, bottom: centered ? undefined : bottom, top, transform: centered ? "translate(-50%, -50%)" : undefined }}>
            <Chip amount={chipAmount} isTournament={isTournament} />
        </div>
    );
});

PlayerChipDisplay.displayName = "PlayerChipDisplay";

export default PlayerChipDisplay;
