/** Reference hole card at factor 1, in screen pixels. */
export const MOBILE_HOLE_CARD_WIDTH = 39;
export const MOBILE_HOLE_CARD_HEIGHT = 51;

/** Mobile landscape cards grow by this many screen pixels of height. Width scales. */
export const MOBILE_LANDSCAPE_CARD_HEIGHT_BUMP = 2;

/** Community faces are 550×805. The slot uses that ratio, not the hole-card box. */
export function communityCardHeight(width: number): number {
    return width * 805 / 550;
}

/** Landscape hole cards: the reference box plus 2px of height, width in proportion. */
export function landscapeHoleCardSize(): { width: number; height: number } {
    const height = MOBILE_HOLE_CARD_HEIGHT + MOBILE_LANDSCAPE_CARD_HEIGHT_BUMP;
    return { width: MOBILE_HOLE_CARD_WIDTH * height / MOBILE_HOLE_CARD_HEIGHT, height };
}

/** Landscape community cards: the face ratio plus 2px of height, width in proportion. */
export function landscapeCommunityCardSize(): { width: number; height: number } {
    const baseHeight = communityCardHeight(MOBILE_HOLE_CARD_WIDTH);
    const height = baseHeight + MOBILE_LANDSCAPE_CARD_HEIGHT_BUMP;
    return { width: MOBILE_HOLE_CARD_WIDTH * height / baseHeight, height };
}

/** Inverse stage zoom keeps hole and community cards the same screen size.
 * Only reduce both together when the safe viewport cannot contain the three
 * vertical card/stack rows. Portrait keeps the 39×51 reference. Landscape
 * hole cards are 2px taller, with the width scaled to match. */
export function mobileCardUnit(portrait: boolean, zoom: number, width: number, height: number): string {
    const factor = portrait
        ? Math.min(1, width / 393, height / 480)
        : Math.min(1, width / 600, height / 263, zoom / 0.5125);
    return `${Math.max(0, factor) / Math.max(0.01, zoom)}px`;
}
