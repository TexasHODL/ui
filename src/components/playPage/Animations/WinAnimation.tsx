import React from "react";
import { useWinnerInfo } from "../../../hooks/game/useWinnerInfo";
import { WinAnimationProps } from "../../../types/index";
import { useChipImageUrl } from "../../../theme/useTableStyles";
import { getChipImageUrl } from "../../../utils/cardImages";
import { useGameMeta } from "../../../context/gameState/GameMetaContext";
import { isTournamentFormat } from "../../../utils/gameFormatUtils";
import { convertUSDCToNumber } from "../../../utils/numberUtils";
import { decomposeAmount } from "../../../utils/chipBreakdown";
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

const RippleRings: React.FC = () => (
    <>
        {Array.from({ length: WIN_RIPPLE_RING_COUNT }, (_, i) => (
            <div key={i} className="win-pulse-ripple-ring" style={{ "--win-ripple-index": i } as React.CSSProperties} />
        ))}
    </>
);


/** Chips thrown by the chipburst. Keep in sync with nothing: geometry is per-chip inline vars. */
export const WIN_CHIPBURST_COUNT = 10;
/** Sparkles that twinkle round the chipburst. */
export const WIN_CHIPBURST_SPARKLE_COUNT = 8;
/** Confetti pieces in the shower. */
export const WIN_CONFETTI_COUNT = 24;

/**
 * Chips for the burst, picked the same cash-aware way as bet / pot chips (Chip.tsx):
 * tournament amounts are chips, cash amounts are micro-USDC converted to dollars, then
 * decomposeAmount picks the denominations. Repeated round-robin to fill the burst.
 * Falls back to the particle chip mix when the amount is unknown.
 */
export const burstChipFiles = (amount: string | undefined, isTournament: boolean): string[] => {
    const dollars = amount ? (isTournament ? Number(amount) : convertUSDCToNumber(amount)) : 0;
    const files: string[] = Number.isFinite(dollars) && dollars > 0
        ? decomposeAmount(dollars).flatMap(stack => Array.from({ length: Math.max(1, stack.visibleCount) }, () => stack.file))
        : [...WIN_PULSE_CHIP_FILES];
    return Array.from({ length: WIN_CHIPBURST_COUNT }, (_, i) => files[i % files.length]);
};

/** Fixed pseudo-random 0..1 per index, so layouts are stable between renders and tests. */
const jitter = (i: number, salt: number): number => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

/** Where each burst chip lands (px from the seat centre, before --win-pulse-size). Wider than tall like the seat. */
const BURST_CHIPS = Array.from({ length: WIN_CHIPBURST_COUNT }, (_, i) => {
    const angle = (i / WIN_CHIPBURST_COUNT) * Math.PI * 2 + (jitter(i, 1) - 0.5) * 0.5 - Math.PI / 2;
    const dist = 0.78 + jitter(i, 2) * 0.32;
    return {
        dx: Math.round(Math.cos(angle) * 150 * dist),
        dy: Math.round(Math.sin(angle) * 92 * dist),
        spin: Math.round((jitter(i, 3) - 0.5) * 720),
        delay: Math.round(jitter(i, 4) * 120),
        size: Math.round(20 + jitter(i, 5) * 8)
    };
});

const BURST_SPARKLES = Array.from({ length: WIN_CHIPBURST_SPARKLE_COUNT }, (_, i) => {
    const angle = ((i + 0.5) / WIN_CHIPBURST_SPARKLE_COUNT) * Math.PI * 2 - Math.PI / 2;
    const dist = 0.7 + jitter(i, 6) * 0.45;
    return {
        dx: Math.round(Math.cos(angle) * 140 * dist),
        dy: Math.round(Math.sin(angle) * 84 * dist),
        delay: Math.round(120 + jitter(i, 7) * 420),
        size: Math.round(10 + jitter(i, 8) * 8),
        color: i % 2 ? "var(--win-brand-pink)" : "var(--win-brand-orange)"
    };
});

const CONFETTI_COLORS = ["var(--win-brand-pink)", "var(--win-brand-orange)", "var(--win-brand-mid)"];
const CONFETTI = Array.from({ length: WIN_CONFETTI_COUNT }, (_, i) => ({
    x: Math.round(((i + jitter(i, 9)) / WIN_CONFETTI_COUNT) * 130 - 15), /* % of seat width, spills past both edges */
    drift: Math.round((jitter(i, 10) - 0.5) * 60),
    spin: Math.round(360 + jitter(i, 11) * 540) * (i % 2 ? 1 : -1),
    delay: Math.round(jitter(i, 12) * 380),
    duration: Math.round(1300 + jitter(i, 13) * 450),
    wide: i % 3 === 0,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
}));

const ChipBurst: React.FC<{ files: string[] }> = ({ files }) => {
    const chipUrl = useChipImageUrl();
    return (
        <div className="win-pulse-chipburst-burst">
            {BURST_CHIPS.map((c, i) => (
                <span
                    key={`c${i}`}
                    className="win-pulse-chipburst-chip"
                    data-chip-file={files[i]}
                    style={{
                        "--win-burst-dx": `${c.dx}px`,
                        "--win-burst-dy": `${c.dy}px`,
                        "--win-burst-spin": `${c.spin}deg`,
                        "--win-burst-delay": `${c.delay}ms`,
                        "--win-burst-chip": `${c.size}px`,
                        backgroundImage: `url("${chipUrl(files[i], getChipImageUrl(files[i]))}")`
                    } as React.CSSProperties}
                />
            ))}
            {BURST_SPARKLES.map((s, i) => (
                <span
                    key={`s${i}`}
                    className="win-pulse-chipburst-sparkle"
                    style={{
                        "--win-burst-dx": `${s.dx}px`,
                        "--win-burst-dy": `${s.dy}px`,
                        "--win-burst-delay": `${s.delay}ms`,
                        "--win-burst-sparkle": `${s.size}px`,
                        "--win-burst-sparkle-color": s.color
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

const ConfettiShower: React.FC = () => (
    <div className="win-pulse-confetti-shower">
        {CONFETTI.map((c, i) => (
            <span
                key={i}
                className={`win-pulse-confetti-piece${c.wide ? " win-pulse-confetti-strip" : ""}`}
                style={{
                    "--win-confetti-x": `${c.x}%`,
                    "--win-confetti-drift": `${c.drift}px`,
                    "--win-confetti-spin": `${c.spin}deg`,
                    "--win-confetti-delay": `${c.delay}ms`,
                    "--win-confetti-fall": `${c.duration}ms`,
                    "--win-confetti-color": c.color
                } as React.CSSProperties}
            />
        ))}
    </div>
);

/** The layers each style draws. Each layer is one element with class win-pulse-<layer>. */
const PulseLayers: React.FC<{ pulseStyle: WinPulseStyle; replay: number; burstFiles: string[] }> = ({ pulseStyle, replay, burstFiles }) => {
    switch (pulseStyle) {
        case "spotlight":
            return (
                <>
                    <div className="win-pulse-spotlight-beam" />
                    <div className="win-pulse-spotlight-pool" />
                </>
            );
        case "chipburst":
            return (
                <>
                    <div className="win-pulse-settle-glow win-pulse-chipburst-glow" key={`g${replay}`} />
                    <ChipBurst key={`b${replay}`} files={burstFiles} />
                </>
            );
        case "neon":
            return (
                <>
                    <div className="win-pulse-neon-bloom" key={`b${replay}`} />
                    <div className="win-pulse-neon-tube" key={`t${replay}`} />
                </>
            );
        case "confetti":
            return (
                <>
                    <div className="win-pulse-settle-glow win-pulse-confetti-glow" key={`g${replay}`} />
                    <ConfettiShower key={`c${replay}`} />
                </>
            );
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
    const { gameFormat } = useGameMeta();

    const winner = winnerBySeat.get(index + 1);
    const winAmount = winner?.amount === undefined ? undefined : String(winner.amount);
    const isTournament = isTournamentFormat(gameFormat);
    const burstFiles = React.useMemo(() => burstChipFiles(winAmount, isTournament), [winAmount, isTournament]);

    if (!winner || !position) return null;

    const pulseStyle = winPulseStyle ?? settings.style;
    const { speed, size, intensity } = settings.tuning;
    const replay = settings.replay ?? 0;

    const wobbleId = `win-ripple-wobble-${index}`;
    const isRipple = pulseStyle === "ripple";
    const vars = {
        "--win-pulse-speed": speed,
        "--win-pulse-size": size,
        "--win-pulse-intensity": intensity,
        "--win-ripple-wobble-filter": `url(#${wobbleId})`
    } as React.CSSProperties;

    const pulse = (
        <div
            className={`win-animation-container win-pulse-${pulseStyle}`}
            data-win-pulse-style={pulseStyle}
            style={{ left: position.left, top: position.top, ...(isRipple ? vars : { "--win-pulse-speed": speed, "--win-pulse-size": size, "--win-pulse-intensity": intensity }) } as React.CSSProperties}
        >
            {isRipple && <RippleWobbleFilter id={wobbleId} speed={speed} size={size} />}
            <PulseLayers pulseStyle={pulseStyle} replay={replay} burstFiles={burstFiles} />
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

    return pulse;
});

WinAnimation.displayName = "WinAnimation";
export default WinAnimation;
