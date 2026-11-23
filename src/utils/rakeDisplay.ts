import { formatMicroUsd } from "@block52/poker-ui-core/utils/moneyDisplay";
import { isSitAndGoFormat, isTournamentFormat } from "@block52/poker-ui-core/utils/gameFormatUtils";

/** Rake config as it arrives from the chain's game options (micro-USDC strings). */
export interface RakeDisplayInput {
    rakePercentage?: number | string | null;
    rakeCap?: string | number | bigint | null;
    rakeFreeThreshold?: string | number | bigint | null;
}

export interface RakeDisplay {
    /** Compact label, e.g. "Network fee 5%" (the chain's rake, block52/poker-vm#2787). */
    short: string;
    /** Label with the cap, e.g. "Network fee 5% \u00b7 cap $0.10" (just the short label when uncapped). */
    withCap: string;
    /** Full sentence for tooltips / screen readers. */
    title: string;
}

const positiveMicro = (value: RakeDisplayInput["rakeCap"]): bigint => {
    if (value === null || value === undefined || value === "") return 0n;
    try {
        const micro = BigInt(typeof value === "number" ? Math.trunc(value) : value);
        return micro > 0n ? micro : 0n;
    } catch {
        return 0n;
    }
};

/**
 * Display-only network fee (chain rake) summary for a table, or null when the table takes none.
 * Sit-and-go / tournament tables return null: their fee is the entry fee, not pot rake.
 */
export const rakeDisplay = (rake: RakeDisplayInput | null | undefined, gameFormat?: string | null): RakeDisplay | null => {
    if (!rake) return null;
    if (gameFormat && (isSitAndGoFormat(gameFormat as never) || isTournamentFormat(gameFormat as never))) return null;
    const pct = Number(rake.rakePercentage);
    if (!Number.isFinite(pct) || pct <= 0) return null;
    const pctLabel = `${Number(pct.toFixed(2))}%`;
    const cap = positiveMicro(rake.rakeCap);
    const threshold = positiveMicro(rake.rakeFreeThreshold);
    const short = `Network fee ${pctLabel}`;
    const capLabel = cap > 0n ? `$${formatMicroUsd(cap)}` : "";
    const withCap = capLabel ? `${short} \u00b7 cap ${capLabel}` : short;
    let title = `${pctLabel} of each pot is taken as a network fee`;
    title += capLabel ? `, capped at ${capLabel} per hand` : ", no cap";
    if (threshold > 0n) title += `; no network fee on pots under $${formatMicroUsd(threshold)}`;
    return { short, withCap, title: title + "." };
};