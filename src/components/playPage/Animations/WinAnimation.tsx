import React, { useMemo } from "react";
import { useWinnerInfo } from "../../../hooks/game/useWinnerInfo";
import { WinAnimationProps } from "../../../types/index";
import { useChipImageUrl } from "../../../theme/useTableStyles";
import { getChipImageUrl } from "../../../utils/cardImages";
import { useGameStateContext } from "../../../context/GameStateContext";
import { isTournamentFormat } from "../../../utils/gameFormatUtils";
import { CHIP_DENOMINATIONS } from "../../../constants/chips";
import "./WinAnimation.css";

/**
 * Chip files for the five floating particles, one per bubble. Resolved through
 * the player's Settings > Chips style (same lookup as bet / pot chips), so the
 * particles match the chips on the table and swap as soon as the setting changes.
 */
export const WIN_PULSE_CHIP_FILES = ["25chip.svg", "100chip.svg", "5chip.svg", "500chip.svg", "1chip.svg"] as const;

/** Concentric rings in the win pulse wave. Keep in sync with --win-pulse-rings in WinAnimation.css. */
export const WIN_PULSE_RING_COUNT = 3;

/**
 * Cash tables are priced in dollars and cents, so their particles come from the
 * same CHIP_DENOMINATIONS set the bet / pot chips use for cash amounts: the cent
 * chips plus the $1 and $5 chips (1c, 5c, 10c, 25c, 50c, $1, $5).
 */
export const WIN_PULSE_CASH_CHIP_FILES: readonly string[] = CHIP_DENOMINATIONS.filter(d => d.value <= 5).map(d => d.file);

/** Random mix of `count` cash chip files, one per particle. */
export function pickCashPulseChips(count = WIN_PULSE_CHIP_FILES.length, random: () => number = Math.random): string[] {
    return Array.from({ length: count }, () => WIN_PULSE_CASH_CHIP_FILES[Math.floor(random() * WIN_PULSE_CASH_CHIP_FILES.length)]);
}

const WinAnimation: React.FC<WinAnimationProps & { position?: { left: string; top: string } }> = React.memo(({ index, position }) => {
    const { winnerBySeat } = useWinnerInfo();
    const chipUrl = useChipImageUrl();
    const { gameFormat } = useGameStateContext();
    // Tournaments and Sit & Gos keep the fixed chip mix; cash tables get a random
    // mix of $/c chips, picked once per pulse so the particles don't flicker.
    const isTournament = isTournamentFormat(gameFormat);
    const files = useMemo<readonly string[]>(() => (isTournament ? WIN_PULSE_CHIP_FILES : pickCashPulseChips()), [isTournament]);

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
                {files.map((file, i) => (
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
