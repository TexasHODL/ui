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

/** Firework bursts above the seat, and sparks per burst. */
export const WIN_FIREWORK_BURSTS = 3;
export const WIN_FIREWORK_SPARKS = 12;
/** Glitter dust motes orbiting the seat. */
export const WIN_GLITTER_COUNT = 26;
/** Sparkles riding the pot stream. */
export const WIN_POTSTREAM_SPARKLES = 7;

const FIREWORK_COLORS = ["var(--win-brand-orange)", "var(--win-brand-pink)", "var(--win-brand-mid)"];
/** Burst centres: % of the seat box (x) and px above its top (y, before --win-pulse-size). */
const FIREWORKS = [
    { x: 24, y: -22, delay: 0, reach: 1 },
    { x: 74, y: -34, delay: 380, reach: 1.15 },
    { x: 50, y: -58, delay: 760, reach: 0.85 }
].slice(0, WIN_FIREWORK_BURSTS);

const Fireworks: React.FC = () => (
    <div className="win-pulse-fireworks-sky">
        {FIREWORKS.map((b, bi) => (
            <span
                key={bi}
                className="win-pulse-fireworks-burst"
                style={{
                    "--win-fw-x": `${b.x}%`,
                    "--win-fw-y": `${b.y}px`,
                    "--win-fw-delay": `${b.delay}ms`,
                    "--win-fw-reach": b.reach
                } as React.CSSProperties}
            >
                <span className="win-pulse-fireworks-flash" />
                {Array.from({ length: WIN_FIREWORK_SPARKS }, (_, i) => (
                    <span
                        key={i}
                        className="win-pulse-fireworks-spark"
                        style={{
                            "--win-fw-angle": `${Math.round((i / WIN_FIREWORK_SPARKS) * 360 + jitter(i + bi * 31, 14) * 14)}deg`,
                            "--win-fw-dist": (0.8 + jitter(i + bi * 31, 15) * 0.35).toFixed(2),
                            "--win-fw-color": FIREWORK_COLORS[(i + bi) % FIREWORK_COLORS.length]
                        } as React.CSSProperties}
                    />
                ))}
            </span>
        ))}
    </div>
);

const GLITTER_COLORS = ["#fff", "var(--win-brand-orange)", "var(--win-brand-pink)", "#ffe3b8", "var(--win-brand-mid)"];
const GLITTER = Array.from({ length: WIN_GLITTER_COUNT }, (_, i) => ({
    start: Math.round(jitter(i, 16) * 360),
    radius: (0.78 + jitter(i, 17) * 0.4).toFixed(2),  /* times --win-glitter-radius */
    orbit: Math.round(9000 + jitter(i, 18) * 9000),
    reverse: i % 4 === 3,
    twinkle: Math.round(900 + jitter(i, 19) * 1400),
    delay: Math.round(jitter(i, 20) * 2000),
    size: (2 + jitter(i, 21) * 3).toFixed(1),
    star: i % 5 === 0,
    color: GLITTER_COLORS[i % GLITTER_COLORS.length]
}));

const Glitter: React.FC = () => (
    <div className="win-pulse-glitter-field">
        {GLITTER.map((g, i) => (
            <span
                key={i}
                className={`win-pulse-glitter-orbit${g.reverse ? " win-pulse-glitter-reverse" : ""}`}
                style={{
                    "--win-glitter-start": `${g.start}deg`,
                    "--win-glitter-r": g.radius,
                    "--win-glitter-orbit": `${g.orbit}ms`
                } as React.CSSProperties}
            >
                <span
                    className={`win-pulse-glitter-mote${g.star ? " win-pulse-glitter-star" : ""}`}
                    style={{
                        "--win-glitter-twinkle": `${g.twinkle}ms`,
                        "--win-glitter-delay": `${g.delay}ms`,
                        "--win-glitter-size": `${g.size}px`,
                        "--win-glitter-color": g.color
                    } as React.CSSProperties}
                />
            </span>
        ))}
    </div>
);

/** Pot elements on the table, best first. */
const POT_SELECTOR = ".pot-pill, .pot-display, .community-pots";
/** Used when no pot is on screen (or no layout, e.g. tests): straight up towards the felt centre. */
const POTSTREAM_FALLBACK = { dx: 0, dy: -160 };

/**
 * Vector (seat-box px, so CSS-scaled tables still line up) from the seat centre to the pot.
 * Measured once on mount / replay, never per frame. Falls back to the table centre, then straight up.
 */
export const measurePotVector = (seatBox: HTMLElement): { dx: number; dy: number } => {
    const seat = seatBox.getBoundingClientRect();
    const scale = seatBox.offsetWidth ? seat.width / seatBox.offsetWidth : 1;
    if (!seat.width || !scale) return POTSTREAM_FALLBACK;
    let target: DOMRect | null = null;
    for (let node = seatBox.parentElement; node && !target; node = node.parentElement) {
        const pot = node.querySelector<HTMLElement>(POT_SELECTOR);
        if (pot) {
            const r = pot.getBoundingClientRect();
            if (r.width) target = r;
        }
    }
    if (!target) {
        const table = seatBox.offsetParent as HTMLElement | null;
        target = table ? table.getBoundingClientRect() : null;
    }
    if (!target || !target.width) return POTSTREAM_FALLBACK;
    const dx = (target.left + target.width / 2 - (seat.left + seat.width / 2)) / scale;
    const dy = (target.top + target.height / 2 - (seat.top + seat.height / 2)) / scale;
    return Math.hypot(dx, dy) < 40 ? POTSTREAM_FALLBACK : { dx: Math.round(dx), dy: Math.round(dy) };
};

const PotStream: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [vec, setVec] = React.useState<{ dx: number; dy: number } | null>(null);
    React.useLayoutEffect(() => {
        const box = ref.current?.parentElement;
        setVec(box ? measurePotVector(box) : POTSTREAM_FALLBACK);
    }, []);
    const v = vec ?? POTSTREAM_FALLBACK;
    const len = Math.round(Math.hypot(v.dx, v.dy));
    const angle = Math.round((Math.atan2(-v.dy, -v.dx) * 180) / Math.PI);
    return (
        <div
            ref={ref}
            className="win-pulse-potstream-path"
            data-measured={vec ? "1" : "0"}
            style={{
                "--win-stream-dx": `${v.dx}px`,
                "--win-stream-dy": `${v.dy}px`,
                "--win-stream-len": `${len}px`,
                "--win-stream-angle": `${angle}deg`,
                visibility: vec ? undefined : "hidden"
            } as React.CSSProperties}
        >
            <span className="win-pulse-potstream-beam" />
            <span className="win-pulse-potstream-head" />
            {Array.from({ length: WIN_POTSTREAM_SPARKLES }, (_, i) => (
                <span
                    key={i}
                    className={`win-pulse-potstream-sparkle${i % 3 === 2 ? " win-pulse-potstream-chip" : ""}`}
                    style={{
                        "--win-stream-delay": `${Math.round(60 + i * 70 + jitter(i, 22) * 40)}ms`,
                        "--win-stream-wobble": `${Math.round((jitter(i, 23) - 0.5) * 18)}px`,
                        "--win-stream-sparkle-color": i % 2 ? "var(--win-brand-pink)" : "var(--win-brand-orange)"
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

/** The layers each style draws. Each layer is one element with class win-pulse-<layer>. */
const PulseLayers: React.FC<{ pulseStyle: WinPulseStyle; replay: number; burstFiles: string[] }> = ({ pulseStyle, replay, burstFiles }) => {
    switch (pulseStyle) {
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
        case "fireworks":
            return (
                <>
                    <div className="win-pulse-settle-glow win-pulse-fireworks-glow" key={`g${replay}`} />
                    <Fireworks key={`f${replay}`} />
                </>
            );
        case "glitter":
            return (
                <>
                    <div className="win-pulse-glitter-haze" />
                    <Glitter />
                </>
            );
        case "cardfan":
            return <div className="win-pulse-settle-glow win-pulse-cardfan-glow" key={`g${replay}`} />;
        case "aura":
            return (
                <div className="win-pulse-aura-sky">
                    <div className="win-pulse-aura-ring" />
                    <div className="win-pulse-aura-blob win-pulse-aura-blob-a" />
                    <div className="win-pulse-aura-blob win-pulse-aura-blob-b" />
                    <div className="win-pulse-aura-blob win-pulse-aura-blob-c" />
                </div>
            );
        case "potstream":
            return (
                <>
                    <div className="win-pulse-settle-glow win-pulse-potstream-glow" key={`g${replay}`} />
                    <PotStream key={`s${replay}`} />
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
        default:
            return <div className="win-pulse-breathing-border" />;
    }
};

type Props = WinAnimationProps & {
    position?: { left: string; top: string };
    /** Overrides the style from WinPulseStyleContext (default: breathing). */
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
            className={`win-animation-container win-pulse-${pulseStyle}${pulseStyle === "cardfan" ? ` win-pulse-replay-${replay % 2}` : ""}`}
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
