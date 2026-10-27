import { createContext, useContext } from "react";

/**
 * Win pulse looks. Each one is its own animation in WinAnimation.css:
 *   breathing  the whole border brightens and dims on a slow sine loop
 *   ripple     brand pink-to-orange: translucent pink fill, glowing orange rim; ripples run centre -> rim shifting pink to orange
 *   chipburst  chips (player's chip set, cash-aware denominations) and sparkles fan out once, then a steady glow
 *   neon       the seat border lit like a neon sign: orange-to-pink gradient flowing round it, flicker on start
 *   confetti   a short shower of orange / pink confetti round the seat, then a soft glow
 *   fireworks  two or three small staggered firework bursts just above the seat, then a soft glow
 *   glitter    fine twinkling dust swirling slowly round the seat on a continuous loop
 *   cardfan    the winner's hole cards fan out a touch with a shine sweep, then settle; soft glow
 *   aura       northern-lights glow: orange / pink / purple gradients drifting and morphing round the seat
 *   potstream  a glowing trail with sparkles streams from the pot to the seat, then the seat glows
 */
export const WIN_PULSE_STYLES = [
    "breathing", "ripple", "chipburst", "neon", "confetti",
    "fireworks", "glitter", "cardfan", "aura", "potstream"
] as const;
export type WinPulseStyle = (typeof WIN_PULSE_STYLES)[number];

export const DEFAULT_WIN_PULSE_STYLE: WinPulseStyle = "breathing";

export const isWinPulseStyle = (value: unknown): value is WinPulseStyle =>
    typeof value === "string" && (WIN_PULSE_STYLES as readonly string[]).includes(value);

/**
 * Global multipliers on top of each style's own CSS variables (1 = the tuned look).
 * speed: >1 is faster. size: scales how far / big the effect reaches. intensity: opacity multiplier.
 */
export interface WinPulseTuning {
    speed: number;
    size: number;
    intensity: number;
}

export const DEFAULT_WIN_PULSE_TUNING: WinPulseTuning = { speed: 1, size: 1, intensity: 1 };

export interface WinPulseSettings {
    style: WinPulseStyle;
    tuning: WinPulseTuning;
    /** Bumping this replays the one-shot parts (chipburst, confetti, neon flicker, fireworks, cardfan, potstream). Dev preview only. */
    replay?: number;
}

/**
 * Players always get the default. Only the dev /table-preview page provides a
 * different value (its dev panel switches style and tuning live).
 */
export const WinPulseStyleContext = createContext<WinPulseSettings>({
    style: DEFAULT_WIN_PULSE_STYLE,
    tuning: DEFAULT_WIN_PULSE_TUNING
});

export const useWinPulseSettings = (): WinPulseSettings => useContext(WinPulseStyleContext);
