/**
 * Playing-style figures for the profile, from the indexer's /players/:address/stats
 * fields. Percentages and aggression_factor are stored ×100 (3960 = 39.60%,
 * 62 = 0.62).
 *
 * VPIP is a preflop call, raise or all-in, over all hands dealt. Blind posts
 * are not voluntary. PFR is a preflop raise only — an all-in is omitted
 * because the log cannot tell a shove that raises from one that only calls.
 * Aggression is (bets + raises + all-ins) / calls across every street.
 * WTSD is showdowns (showing or mucked) over all hands dealt, not only hands
 * that saw the flop. W$SD is wins with won_amount > 0 over those showdowns.
 * With no hands, or no calls for aggression, a tile is a dash, not 0.00.
 */
import { hasValue, isNumber } from "@block52/ui-sdk/helpers";

const UNKNOWN = "—";

export interface PlayingStyleDisplay {
    vpip: string;
    pfr: string;
    aggression: string;
    wtsd: string;
    wssd: string;
}

/** Title, the full name shown in bold, and the rest of the explanation bubble. */
export interface PlayingStyleFigure {
    key: keyof PlayingStyleDisplay;
    title: string;
    name: string;
    explanation: string;
}

export const PLAYING_STYLE_FIGURES: readonly PlayingStyleFigure[] = [
    {
        key: "vpip",
        title: "VPIP",
        name: "Voluntarily put money in pot",
        explanation:
            "How often you voluntarily put chips in preflop — a call, raise or all-in, not posting blinds — measured over all hands you were dealt into."
    },
    {
        key: "pfr",
        title: "PFR",
        name: "Preflop raise",
        explanation:
            "How often you raised preflop, measured over all hands you were dealt into. Only a raise counts; an all-in is left out because the log cannot tell a shove that raises from one that only calls."
    },
    {
        key: "aggression",
        title: "Aggression",
        name: "Aggression",
        explanation:
            "Bets, raises and all-ins divided by calls, across every street. Above 1 means you bet more than you call. Shown as a dash when you have no calls."
    },
    {
        key: "wtsd",
        title: "WTSD",
        name: "Went to showdown",
        explanation: "How often you reached showdown, measured over all hands you were dealt into, not only the hands where you saw the flop."
    },
    {
        key: "wssd",
        title: "W$SD",
        name: "Won money at showdown",
        explanation: "Of the hands that reached showdown, how often you won."
    }
];

/** Indexer /stats fields used by the Playing Style card. */
export interface IndexerPlayingStyle {
    total_hands: number;
    total_calls: number;
    vpip: number;
    pfr: number;
    aggression_factor: number;
    wtsd: number;
    won_at_showdown: number;
}

function wholeCount(value: number): boolean {
    return isNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function formatScaledPercent(scaled: number): string {
    if (!isNumber(scaled) || !Number.isFinite(scaled)) return UNKNOWN;
    return `${(scaled / 100).toFixed(2)}%`;
}

function formatScaledRatio(scaled: number): string {
    if (!isNumber(scaled) || !Number.isFinite(scaled)) return UNKNOWN;
    return (scaled / 100).toFixed(2);
}

/**
 * The five panel figures from the live indexer. No hands, or no calls for
 * aggression, stay an em dash instead of 0.00.
 */
export function formatIndexerPlayingStyle(stats: IndexerPlayingStyle | null | undefined): PlayingStyleDisplay {
    if (!hasValue(stats) || !wholeCount(stats.total_hands) || stats.total_hands === 0) {
        return { vpip: UNKNOWN, pfr: UNKNOWN, aggression: UNKNOWN, wtsd: UNKNOWN, wssd: UNKNOWN };
    }
    const aggression = wholeCount(stats.total_calls) && stats.total_calls > 0 ? formatScaledRatio(stats.aggression_factor) : UNKNOWN;
    return {
        vpip: formatScaledPercent(stats.vpip),
        pfr: formatScaledPercent(stats.pfr),
        aggression,
        wtsd: formatScaledPercent(stats.wtsd),
        wssd: formatScaledPercent(stats.won_at_showdown)
    };
}
