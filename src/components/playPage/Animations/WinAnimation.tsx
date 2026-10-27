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

/** Peak displacement (px) of the ripple's SVG wobble filter, scaled by --win-pulse-size. SVG attributes can't read CSS vars. */
export const WIN_RIPPLE_WOBBLE_SCALE = 12;
/** One full wobble loop (ms) of the turbulence baseFrequency, divided by --win-pulse-speed. */
export const WIN_RIPPLE_WOBBLE_MS = 5200;

/**
 * Liquid wobble: fractal noise (baseFrequency drifts via SMIL, no JS per frame) displaces the
 * cup's pixels so ring edges, rim of the liquid and highlights wobble organically.
 */
const RippleWobbleFilter: React.FC<{ id: string; speed: number; size: number }> = ({ id, speed, size }) => (
    <svg className="win-pulse-ripple-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={id} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.042" numOctaves={2} seed={3} result="noise">
                <animate
                    attributeName="baseFrequency"
                    dur={`${WIN_RIPPLE_WOBBLE_MS / Math.max(speed, 0.05)}ms`}
                    values="0.018 0.042;0.026 0.05;0.014 0.034;0.018 0.042"
                    repeatCount="indefinite"
                />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={WIN_RIPPLE_WOBBLE_SCALE * size} xChannelSelector="R" yChannelSelector="G" />
        </filter>
    </svg>
);

const RippleRings: React.FC<{ className?: string }> = ({ className = "win-pulse-ripple-ring" }) => (
    <>
        {Array.from({ length: WIN_RIPPLE_RING_COUNT }, (_, i) => (
            <div key={i} className={className} style={{ "--win-ripple-index": i } as React.CSSProperties} />
        ))}
    </>
);

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
                        <RippleRings />
                        <div className="win-pulse-ripple-glint win-pulse-ripple-glint-a" />
                        <div className="win-pulse-ripple-glint win-pulse-ripple-glint-b" />
                        <div className="win-pulse-ripple-glint win-pulse-ripple-glint-c" />
                    </div>
                    <div className="win-pulse-ripple-rim" />
                    {/* Rim highlight: the same wave rings (same timing + wobble), drawn bright and masked to the rim band,
                        so the rim lights only where a wave is touching it right now. */}
                    <div className="win-pulse-ripple-rim-hit">
                        <div className="win-pulse-ripple-rim-hit-band">
                            <RippleRings className="win-pulse-ripple-hit-ring" />
                        </div>
                    </div>
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

    const wobbleId = `win-ripple-wobble-${index}`;
    const isRipple = pulseStyle === "ripple";
    const vars = {
        "--win-pulse-speed": speed,
        "--win-pulse-size": size,
        "--win-pulse-intensity": intensity,
        "--win-ripple-wobble-filter": `url(#${wobbleId})`
    } as React.CSSProperties;

    return (
        <div
            className={`win-animation-container win-pulse-${pulseStyle}`}
            data-win-pulse-style={pulseStyle}
            style={{ left: position.left, top: position.top, ...(isRipple ? vars : { "--win-pulse-speed": speed, "--win-pulse-size": size, "--win-pulse-intensity": intensity }) } as React.CSSProperties}
        >
            {isRipple && <RippleWobbleFilter id={wobbleId} speed={speed} size={size} />}
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
