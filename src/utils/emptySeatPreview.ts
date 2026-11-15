/**
 * Temporary empty-seat mockups (`?emptySeat=a|b|c|d`).
 *
 * The default table is unchanged. The query only swaps the vacant-seat mark
 * so the same snapshot can be compared. Not a product setting.
 */
import { isNullish } from "./guards";

export const EMPTY_SEAT_VARIANTS = ["a", "b", "c", "d"] as const;
export type EmptySeatVariant = (typeof EMPTY_SEAT_VARIANTS)[number];

export function parseEmptySeatVariant(value: string | null | undefined): EmptySeatVariant | null {
    if (isNullish(value)) return null;
    const key = value.trim().toLowerCase();
    for (const variant of EMPTY_SEAT_VARIANTS) {
        if (variant === key) return variant;
    }
    return null;
}

/** The variant on a page URL, or null when the table should keep today's seats. */
export function emptySeatVariantFromSearch(search: string): EmptySeatVariant | null {
    return parseEmptySeatVariant(new URLSearchParams(search).get("emptySeat"));
}
