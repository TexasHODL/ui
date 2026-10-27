import React from "react";
import { useWinnerInfo } from "../../../hooks/game/useWinnerInfo";
import { WinAnimationProps } from "../../../types/index";
import { useChipImageUrl } from "../../../theme/useTableStyles";
import { getChipImageUrl } from "../../../utils/cardImages";
import { useWinPulseSettings, type WinPulseStyle } from "./winPulseStyle";
import "./WinAnimation.css";

/**
 * Chip files for the five floating particles, one per bubble. Resolved through
 * the player's Settings > Chips style (same lookup as bet / pot chips), so the
 * particles match the chips on the table and swap as soon as the setting changes.
 */
export const WIN_PULSE_CHIP_FILES = ["25chip.svg", "100chip.svg", "5chip.svg", "500chip.svg", "1chip.svg"] as const;

/** Sonar rings in flight at once. Keep in sync with --win-sonar-rings in WinAnimation.css. */
export const WIN_SONAR_RING_COUNT = 4;

/** Ripples in flight inside the seat at once. Keep in sync with --win-ripple-rings in WinAnimation.css. */
export const WIN_RIPPLE_RING_COUNT = 3;

/** The layers each style draws. Each layer is one element with class win-pulse-<layer>. */
const PulseLayers: React.FC<{ pulseStyle: WinPulseStyle }> = ({ pulseStyle }) => {
    switch (pulseStyle) {
        case "sonar":
            return (
                <>
                    {Array.from({ length: WIN_SONAR_RING_COUNT }, (_, i) => (
                        <div key={i} className="win-pulse-sonar-ring" style={{ "--win-sonar-index": i } as React.CSSProperties} />
                    ))}
                </>
            );
        case "halo":
            return (
                <>
                    <div className="win-pulse-halo-track" />
                    <div className="win-pulse-halo-comet" />
                </>
            );
        case "ripple":
            return (
                <>
                    <div className="win-pulse-ripple-cup">
                        {Array.from({ length: WIN_RIPPLE_RING_COUNT }, (_, i) => (
                            <div key={i} className="win-pulse-ripple-ring" style={{ "--win-ripple-index": i } as React.CSSProperties} />
                        ))}
                    </div>
                    <div className="win-pulse-ripple-rim" />
                </>
            );
        case "breathing":
            return <div className="win-pulse-breathing-border" />;
        case "heartbeat":
        default:
            return <div className="win-pulse-heartbeat-border" />;
    }
};

type Props = WinAnimationProps & {
    position?: { left: string; top: string };
    /** Overrides the style from WinPulseStyleContext (default: heartbeat). */
    winPulseStyle?: WinPulseStyle;
};

const WinAnimation: React.FC<Props> = React.memo(({ index, position, winPulseStyle }) => {
    const { winnerBySeat } = useWinnerInfo();
    const chipUrl = useChipImageUrl();
    const settings = useWinPulseSettings();

    const isWinner = winnerBySeat.has(index + 1);
    if (!isWinner || !position) return null;

    const pulseStyle = winPulseStyle ?? settings.style;
    const { speed, size, intensity } = settings.tuning;

    return (
        <div
            className={`win-animation-container win-pulse-${pulseStyle}`}
            data-win-pulse-style={pulseStyle}
            style={{
                left: position.left,
                top: position.top,
                "--win-pulse-speed": speed,
                "--win-pulse-size": size,
                "--win-pulse-intensity": intensity
            } as React.CSSProperties}
        >
            <PulseLayers pulseStyle={pulseStyle} />
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
