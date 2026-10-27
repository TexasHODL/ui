import React from "react";
import { useWinnerInfo } from "../../../hooks/game/useWinnerInfo";
import { WinAnimationProps } from "../../../types/index";
import { useChipImageUrl } from "../../../theme/useTableStyles";
import { getChipImageUrl } from "../../../utils/cardImages";
import "./WinAnimation.css";

/**
 * Chip files for the five floating particles, one per bubble. Resolved through
 * the player's Settings > Chips style (same lookup as bet / pot chips), so the
 * particles match the chips on the table and swap as soon as the setting changes.
 */
export const WIN_PULSE_CHIP_FILES = ["25chip.svg", "100chip.svg", "5chip.svg", "500chip.svg", "1chip.svg"] as const;

/** Concentric rings in the win pulse wave. Keep in sync with --win-pulse-rings in WinAnimation.css. */
export const WIN_PULSE_RING_COUNT = 3;

const WinAnimation: React.FC<WinAnimationProps & { position?: { left: string; top: string } }> = React.memo(({ index, position }) => {
    const { winnerBySeat } = useWinnerInfo();
    const chipUrl = useChipImageUrl();

    const isWinner = winnerBySeat.has(index + 1);
    if (!isWinner || !position) return null;

    return (
        <div className="win-animation-container" style={{ left: position.left, top: position.top }}>
            <div className="win-animation-glow" />
            {Array.from({ length: WIN_PULSE_RING_COUNT }, (_, i) => (
                <div
                    key={`ring-${i}`}
                    className="win-animation-ring"
                    style={{ "--win-pulse-ring-index": i } as React.CSSProperties}
                />
            ))}
            <ul className="bubbles">
                {WIN_PULSE_CHIP_FILES.map((file, i) => (
                    <li
                        key={i}
                        className="bubble"
                        data-chip-file={file}
                        style={{ backgroundImage: `url("${chipUrl(file, getChipImageUrl(file))}")` }}
                    />
                ))}
            </ul>
        </div>
    );
});

WinAnimation.displayName = "WinAnimation";
export default WinAnimation;
