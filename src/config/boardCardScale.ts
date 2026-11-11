/**
 * Community-card row vs side-seat hole cards on the portrait felt.
 *
 * Desktop cards are 85×127 with an 8px gap (OppositePlayerCards.css `.card`,
 * Tailwind `gap-2`). Five of them are 457px wide. The portrait felt is 500px,
 * and the 4- and 9-seat rail players sit on that edge, so the row runs into
 * their hole cards. 2- and 6-seat boards already sit clear of every hole card.
 * Landscape felt is 1000px wide and phones size cards through `--mobile-unit`,
 * so both pass `narrowPortraitFelt` false and stay at scale 1.
 */

/** Desktop community card, OppositePlayerCards.css `.card`. */
export const COMMUNITY_CARD_WIDTH = 85;
export const COMMUNITY_CARD_HEIGHT = 127;
/** Tailwind `gap-2` on `.community-card-row` at the 16px root. */
export const COMMUNITY_CARD_GAP = 8;

/** Portrait felt width. 4- and 9-seat side seats sit on this edge. */
export const PORTRAIT_FELT_WIDTH = 500;

/** HoleCardFan: 60×80 cards, centres 23px off the seat, rotated ±8°. */
const HOLE_CARD_WIDTH = 60;
const HOLE_CARD_HEIGHT = 80;
const HOLE_CARD_CENTER_OFFSET = 23;
const HOLE_CARD_ROTATION_DEG = 8;

/** Table pixels of air between a community card and the nearest hole-card corner.
 *  The fan's drop shadow is 7px, so this leaves a visible gutter past the shadow. */
export const BOARD_HOLE_AIR = 22;

/** How far a rotated hole card reaches toward the felt centre, from its seat. */
export function holeCardReach(): number {
    const rad = (HOLE_CARD_ROTATION_DEG * Math.PI) / 180;
    const halfW = (HOLE_CARD_WIDTH / 2) * Math.cos(rad) + (HOLE_CARD_HEIGHT / 2) * Math.sin(rad);
    return HOLE_CARD_CENTER_OFFSET + halfW;
}

/** Width of the five-card row at `scale`, including the gaps. */
export function communityRowWidth(scale: number): number {
    return (5 * COMMUNITY_CARD_WIDTH + 4 * COMMUNITY_CARD_GAP) * scale;
}

/**
 * Scale for the five-card row. `narrowPortraitFelt` is the desktop/tablet
 * portrait stage (500px felt, full-size cards). 4- and 9-seat shrink so the
 * row clears the rail hole cards; every other layout stays at 1.
 */
export function portraitBoardCardScale(tableSize: number, narrowPortraitFelt: boolean): number {
    if (!narrowPortraitFelt || (tableSize !== 4 && tableSize !== 9)) return 1;
    const available = PORTRAIT_FELT_WIDTH - 2 * (holeCardReach() + BOARD_HOLE_AIR);
    const natural = communityRowWidth(1);
    if (available >= natural) return 1;
    return available / natural;
}
