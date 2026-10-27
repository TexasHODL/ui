import { createContext, useContext } from "react";

/**
 * Win pulse looks. Each one is its own animation in WinAnimation.css:
 *   heartbeat  the seat border does a strong lub-dub double beat, then rests
 *   sonar      thin crisp rings travel well out onto the felt, no glow
 *   halo       a bright comet of light spins around the seat border
 *   breathing  the whole border brightens and dims on a slow sine loop
 *   ripple     translucent gold fill with a steady glowing rim; ripples run from the centre out to the rim
 */
export const WIN_PULSE_STYLES = ["heartbeat", "sonar", "halo", "breathing", "ripple"] as const;
export type WinPulseStyle = (typeof WIN_PULSE_STYLES)[number];

export const DEFAULT_WIN_PULSE_STYLE: WinPulseStyle = "heartbeat";

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
