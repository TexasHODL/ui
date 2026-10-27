import { useCallback, useSyncExternalStore } from "react";
import { getCardImageUrl } from "../utils/cardImages";
import { chipStyleForFormat, chipStyleUrl, dealerStyleUrl, deckCardUrl, getTableStyles, subscribeTableStyles, type TableStyles } from "./tableStyles";

/** The player's saved table styles; re-renders when any of them changes. */
export function useTableStyles(): TableStyles {
    return useSyncExternalStore(subscribeTableStyles, getTableStyles, getTableStyles);
}

/** Card face URL in the chosen deck. Empty / hidden codes fall back to the app's own image (card back). */
export function useCardFaceUrl(): (code: string) => string {
    const { deck } = useTableStyles();
    return useCallback((code: string) => deckCardUrl(deck, code) ?? getCardImageUrl(code), [deck]);
}

/**
 * Chip image URL in the chosen chip style, or `fallback` (the live CDN chip) for Current.
 * Pass `isTournament` (tournament / Sit & Go, via isTournamentFormat) so Current never
 * falls back to the CDN $ chips on a table that plays in chips.
 */
export function useChipImageUrl(isTournament = false): (file: string, fallback: string) => string {
    const { chips } = useTableStyles();
    const style = chipStyleForFormat(chips, isTournament);
    return useCallback((file: string, fallback: string) => chipStyleUrl(style, file) ?? fallback, [style]);
}

/** Dealer button image URL in the chosen style, or `fallback` (the current button art). */
export function useDealerImageUrl(fallback: string): string {
    const { dealer } = useTableStyles();
    return dealerStyleUrl(dealer) ?? fallback;
}
