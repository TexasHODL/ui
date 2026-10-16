/**
 * Stage Geometry Engine
 *
 * Calculates all table layout positions from the spec's stadium-intersection model.
 * Replaces ~1700 lines of hardcoded position arrays with calculated positions.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 1. SPEC COORDINATES (from issue #142)
 *    TexasHODL provided exact seat positions on a 1600×850 "stage" using
 *    a stadium-intersection model (radial angles from table center).
 *
 * 2. COORDINATE CONVERSION
 *    stageToTable() converts those absolute stage coordinates into
 *    positions relative to the 900×450 table div:
 *      Stage (1282.2, 683.5) → Table-relative { left: "932.2px", top: "373.5px" }
 *
 * 3. DERIVED POSITIONS
 *    Chips and animations are calculated from seat positions:
 *      - Chips:      40% from seat toward table center (adjust CHIP_DISTANCE)
 *      - Turn anim:  seat position + 80px down (adjust TURN_ANIM_Y_OFFSET)
 *      - Win anim:   same as seat position
 *    The dealer button is not a table coordinate. It is drawn on the seat
 *    widget, up and to the left of that seat's number badge.
 *
 * 4. VIEWPORT SCALING
 *    Positions are FIXED on the table. Screen-size adaptation is handled by
 *    zoom/scale on the table container (calculateZoom + getTableTransform).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW TO FINE-TUNE POSITIONS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * To move ALL chips/animations globally:
 *   → Change the distance constants: CHIP_DISTANCE, TURN_ANIM_Y_OFFSET
 *
 * To nudge ONE specific seat's element by a few pixels:
 *   → Add an entry to GLOBAL_OFFSETS (applies on all screen sizes)
 *     Example: GLOBAL_OFFSETS = { 9: { chips: { 3: { dx: -5, dy: 10 } } } }
 *
 * To nudge ONE specific seat on ONE specific screen size:
 *   → Add an entry to VIEWPORT_OFFSETS
 *     Example: VIEWPORT_OFFSETS["mobile-portrait"] = { 9: { chips: { 5: { dy: -8 } } } }
 *
 * dx = horizontal offset (positive = right, negative = left)
 * dy = vertical offset (positive = down, negative = up)
 *
 * References:
 * - Issue #142: https://github.com/block52/ui/issues/142
 * - Issue #46:  https://github.com/block52/ui/issues/46
 */

import { mobileCardUnit } from "./mobileCardSizing";

// ─── Types ───────────────────────────────────────────────────────────

export interface Position {
    left: string;
    top: string;
    color?: string;
}

export interface ChipPosition {
    left: string;
    bottom: string;
    /** Set on mobile, where the chip is centred on this table-space point. */
    top?: string;
}

/**
 * Where a seat's two hole cards are drawn, as the CENTRE of each 60×80 card in
 * table-div coordinates (ui#21). Derived from the seat position exactly the way
 * `Player` / `OppositePlayer` lay their cards out: a two-card row with a 4px gap
 * at the top of the 160×140 seat box. The dealing animation flies card backs
 * from {@link DECK_ORIGIN} to these points, so they must match the components'
 * static render — tune with the debug markers (key 7), not by guessing.
 */
export interface HoleCardSlotPosition {
    first: Position;
    second: Position;
}

// ─── Stage Constants (from spec) ─────────────────────────────────────

export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 850;
export const TABLE_WIDTH = 1000;
export const TABLE_HEIGHT = 500;

/**
 * Ceiling on how much wider the mobile-landscape felt may be than the desktop
 * 2:1 stadium. `mobileLandscapeWidthStretch` uses less when the outer seats
 * would leave the stage, and never goes below 1. A short phone may exceed the
 * old 2.4:1 shape so seats 3 and 8 sit near the stage edges.
 */
export const MOBILE_LANDSCAPE_WIDTH_STRETCH = 1.7;

/**
 * How much taller the mobile-landscape felt and seat ring are than the
 * desktop 500px stadium. 1 keeps that height. `mobileLandscapeHeightStretch`
 * may lower this so the top hole cards stay a few pixels under the header
 * and the lowest action box stays a few pixels above the bottom edge. It
 * never goes below 1, and it does not give back the width stretch. The room
 * between those two edges goes to the felt.
 */
export const MOBILE_LANDSCAPE_HEIGHT_STRETCH = 1.4;

/**
 * Ceiling on how much taller the mobile-portrait felt and seat ring are than
 * the 1000px stadium. `mobilePortraitHeightStretch` uses less when a short
 * phone would push the hero's action banner into the dock, and never goes
 * below 1. Width is not stretched. This is the one knob for that height.
 */
export const MOBILE_PORTRAIT_HEIGHT_STRETCH = 1.35;

/** One-row mobile header. The hand-strength chip overlays, so it is not in this. */
const MOBILE_LANDSCAPE_CHROME = 48;

/** Portrait header (44px row plus the 22px status fallback, including its border). */
const MOBILE_PORTRAIT_HEADER = 68;

/** Portrait action dock. `mobileReadability.css` reserves 86px under the stage. */
const MOBILE_PORTRAIT_DOCK = 86;

/**
 * The hand-strength chip used to be a row above the portrait stage. It now
 * overlays, and these pixels stay out of the zoom so the height stretch can
 * spend them on the felt. Taking them back into the zoom would widen the table.
 */
const MOBILE_PORTRAIT_ZOOM_RESERVE = 34;

/** Screen pixels between the stage top and the top hole cards.
 *  The painted card sits about 3px above this model, so 7 lands the art ~4px
 *  under the header. */
const MOBILE_PORTRAIT_TOP_GAP = 7;

/** Screen pixels between the hero action banner and the bottom of the stage.
 *  The painted box sits about 2px below this model, so 6 lands the art ~4px
 *  above the dock. */
const MOBILE_PORTRAIT_BOTTOM_GAP = 6;

/** Unstretched portrait seat span: hero at 1300, top seat at 275. */
const PORTRAIT_SEAT_SPAN = 1025;

/**
 * The table currently being laid out. Each seat count has its own zoom, so
 * the height that fills a 2-seat ring is short for a 9-seat ring. The layout
 * hook and the position helpers set this before reading the felt.
 */
let activePortraitSize: TableSize | null = null;

export function notePortraitSize(size: TableSize): void {
    activePortraitSize = size;
}

/** Screen pixels between the stage top and the top hole cards.
 *  The painted card sits about 2px above this model, so 6 lands the art ~4px
 *  under the header. */
const MOBILE_LANDSCAPE_TOP_GAP = 6;

/** Screen pixels between the lowest action box and the stage bottom. */
const MOBILE_LANDSCAPE_BOTTOM_GAP = 6;

/** Screen pixels between an outer seat's cards or action box and the stage side. */
const MOBILE_LANDSCAPE_SIDE_MARGIN = 8;

/**
 * Half-width, in stage pixels, of the wide labels that sit on the outer
 * seats. SITTING OUT on a 9-seat edge measures about 201. RAISE TO $1250 on
 * a 6-seat edge measures about 289. The box is laid out at 30px and then
 * scaled with the stage, so these stay constant while the seat widget does not.
 */
export const MOBILE_LANDSCAPE_BANNER_HALF = 104;
const MOBILE_LANDSCAPE_WIDE_BANNER_HALF = 152;

/**
 * The landscape hand-strength chip used to be a row above the stage. It now
 * overlays, and these pixels stay out of the zoom so the height stretch can
 * spend them on the felt.
 */
const MOBILE_LANDSCAPE_ZOOM_RESERVE = 34;

/**
 * Stage pixels the action banner hangs below the hole-card bottom. The banner
 * is 55px and tucks 22px under the stack badge; the card-bottom model already
 * reaches that tuck, so 33px of the box still sits below the cards. Those
 * pixels are inside the zoomed stage, so they are not multiplied by the card unit.
 */
const MOBILE_LANDSCAPE_ACTION_BELOW_CARDS = 33;
export const TABLE_SURFACE_HEIGHT = 500; // Match spec: table surface fills the full table div
export const TABLE_CENTER_X = 800;
export const TABLE_CENTER_Y = 535;
export const SEAT_OFFSET = 72;

// Table div origin in stage coordinates
export const TABLE_ORIGIN_X = TABLE_CENTER_X - TABLE_WIDTH / 2;   // 300
export const TABLE_ORIGIN_Y = TABLE_CENTER_Y - TABLE_HEIGHT / 2;  // 285

// ─── Stage Orientation ───────────────────────────────────────────────
//
// Portrait viewports get a REAL portrait stage — a vertical stadium with its
// own seat ring — instead of the old approach of rotating the landscape stage
// 90° (which rendered every seat label and card sideways and was hidden
// behind the "Rotate to Play" gate).

export type StageOrientation = "landscape" | "portrait" | "mobile-landscape";

export interface StageDims {
    stageWidth: number;
    stageHeight: number;
    /** Felt div width/height (the table surface). */
    tableWidth: number;
    tableHeight: number;
    /** Table centre in stage coordinates. */
    centerX: number;
    centerY: number;
    /** Felt div origin in stage coordinates. */
    originX: number;
    originY: number;
}

export const STAGE_DIMS: Record<StageOrientation, StageDims> = {
    // Unstretched base, same 1000×500 stadium as desktop. Mobile landscape
    // widens and heightens it in stageDimsFor. Portrait heightens its own
    // 500×1000 stadium there. Both still uniform-scale the stage. Desktop
    // reads these numbers as-is.
    "mobile-landscape": {
        stageWidth: 1600,
        stageHeight: 850,
        tableWidth: TABLE_WIDTH,
        tableHeight: TABLE_HEIGHT,
        centerX: TABLE_CENTER_X,
        centerY: TABLE_CENTER_Y,
        originX: TABLE_ORIGIN_X,
        originY: TABLE_ORIGIN_Y
    },
    landscape: {
        stageWidth: STAGE_WIDTH,
        stageHeight: STAGE_HEIGHT,
        tableWidth: TABLE_WIDTH,
        tableHeight: TABLE_HEIGHT,
        centerX: TABLE_CENTER_X,
        centerY: TABLE_CENTER_Y,
        originX: TABLE_ORIGIN_X,
        originY: TABLE_ORIGIN_Y
    },
    portrait: {
        stageWidth: 850,
        stageHeight: 1600,
        tableWidth: 500,
        tableHeight: 1000,
        centerX: 425,
        centerY: 800,
        originX: 175,
        originY: 300
    }
};

export function getStageOrientation(): StageOrientation {
    const mode = getViewportMode();
    return mode === "mobile-portrait" ? "portrait" : mode === "mobile-landscape" ? "mobile-landscape" : "landscape";
}

/** Spread used by the width cap. Inlined so the cap does not call getStageDims. */
function spreadForWidthCap(sx: number, sy: number): [number, number] {
    const dx = sx - TABLE_CENTER_X;
    const dy = sy - TABLE_CENTER_Y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0 || (SEAT_SPREAD as number) === 0) return [sx, sy];
    return [sx + (dx / dist) * SEAT_SPREAD, sy + (dy / dist) * SEAT_SPREAD];
}

/** Unscaled vertical extent of one ring, plus the player-UI padding above and below. */
function ringContentHeight(size: 2 | 4 | 6 | 9): number {
    const pad = PLAYER_UI_PADDING["mobile-landscape"];
    const { topY, botY } = spreadSeatExtent(size);
    return (botY - topY) + pad.top + pad.bottom;
}

/** Distance from the table centre to the leftmost seat, after the inward spread. */
function sideOffset(size: 2 | 4 | 6 | 9): number {
    let minX = Infinity;
    for (const [x, y] of SEAT_COORDS[size]) {
        const [sx] = spreadForWidthCap(x, y);
        minX = Math.min(minX, sx);
    }
    return TABLE_CENTER_X - minX;
}

/** Outer rings and the wide label that hangs off them. 2-seat labels are centred. */
const OUTER_LABELS: ReadonlyArray<readonly [2 | 4 | 6 | 9, number]> = [
    [6, MOBILE_LANDSCAPE_WIDE_BANNER_HALF],
    [9, MOBILE_LANDSCAPE_BANNER_HALF]
];

/** Zoom at which the widest outer label still clears the stage side. */
function bannerZoomCap(containerW: number): number {
    const room = containerW / 2 - MOBILE_LANDSCAPE_SIDE_MARGIN;
    if (room <= 0) return Number.POSITIVE_INFINITY;
    let cap = Number.POSITIVE_INFINITY;
    for (const [size, half] of OUTER_LABELS) {
        const side = sideOffset(size);
        if (side <= 0) continue;
        cap = Math.min(cap, room / (side + half));
    }
    return cap;
}

/**
 * Stretch actually applied on mobile landscape. Wide enough that the outer
 * seats' cards sit {@link MOBILE_LANDSCAPE_SIDE_MARGIN}px inside the stage,
 * and short of the action column. Zoom stays the height fit, so the cards do
 * not shrink to buy width. Never below 1, never above
 * {@link MOBILE_LANDSCAPE_WIDTH_STRETCH}.
 */
export function mobileLandscapeWidthStretch(): number {
    const requested = Math.max(1, MOBILE_LANDSCAPE_WIDTH_STRETCH);
    if (typeof window === "undefined") return 1;
    if (getStageOrientation() !== "mobile-landscape") return 1;
    const params = VIEWPORT_PARAMS["mobile-landscape"];
    const containerW = window.innerWidth - 124;
    const containerH = window.innerHeight - MOBILE_LANDSCAPE_CHROME;
    // Same usable height calculateZoom paints with, so the stretch is not
    // computed against a zoom the stage never uses.
    const usableH = containerH - params.paddingV - MOBILE_LANDSCAPE_ZOOM_RESERVE;
    if (containerW <= 0 || usableH <= 0) return 1;
    // 9-seat is the widest ring. 6-seat sits further in, but its RAISE TO
    // label is wider, so both rings limit the stretch. A label cannot use a
    // zoom that would carry it into the action column.
    let zoom = usableH / ringContentHeight(9);
    zoom = Math.min(zoom, bannerZoomCap(containerW));
    if (zoom <= 0) return 1;
    const factor = Math.min(1, containerW / 600, containerH / 263, zoom / 0.5125);
    const seatHalf = (96 * factor) / 2;
    let fill = requested;
    for (const [size, half] of OUTER_LABELS) {
        const widgetHalf = Math.max(seatHalf, half * zoom);
        const side = sideOffset(size);
        const room = containerW / 2 - MOBILE_LANDSCAPE_SIDE_MARGIN - widgetHalf;
        if (room <= 0 || side <= 0) return 1;
        fill = Math.min(fill, room / (side * zoom));
    }
    return Math.min(requested, Math.max(1, fill));
}

/** Felt dimensions for one orientation. Desktop is the only unstretched stage. */
export function stageDimsFor(orientation: StageOrientation): StageDims {
    const base = STAGE_DIMS[orientation];
    if (orientation === "portrait") {
        const tableHeight = base.tableHeight * mobilePortraitHeightStretch();
        return {
            ...base,
            tableHeight,
            originY: base.centerY - tableHeight / 2
        };
    }
    if (orientation !== "mobile-landscape") return base;
    const tableWidth = TABLE_WIDTH * mobileLandscapeWidthStretch();
    const tableHeight = TABLE_HEIGHT * mobileLandscapeHeightStretch();
    return {
        ...base,
        tableWidth,
        tableHeight,
        originX: TABLE_CENTER_X - tableWidth / 2,
        originY: TABLE_CENTER_Y - tableHeight / 2
    };
}

export function getStageDims(): StageDims {
    return stageDimsFor(getStageOrientation());
}

// ─── Seat Colors ─────────────────────────────────────────────────────

const SEAT_COLORS_2 = ["#4ade80", "#3b82f6"];

const SEAT_COLORS_4 = [
    "#4ade80", "#f97316", "#3b82f6", "#ec4899"
];

const SEAT_COLORS_6 = [
    "#4ade80", "#f97316", "#ef4444",
    "#3b82f6", "#8b5cf6", "#ec4899"
];

const SEAT_COLORS_9 = [
    "#4ade80", "#f97316", "#ef4444",
    "#3b82f6", "#8b5cf6", "#212529",
    "#FFD700", "#ec4899", "#6b7280"
];

const SEAT_COLORS: Record<number, string[]> = {
    2: SEAT_COLORS_2,
    4: SEAT_COLORS_4,
    6: SEAT_COLORS_6,
    9: SEAT_COLORS_9
};

// ─── Seat Coordinates (from spec JSON, stage px) ─────────────────────

// Each entry is [stageX, stageY] from the issue #142 spec files
export const SEAT_COORDS: Record<number, [number, number][]> = {
    2: [
        [800, 832],      // seat 1 bottom
        [800, 238]       // seat 2 top
    ],
    4: [
        [800, 832],     // Seat 1 - bottom-center
        [317.8, 535],  // Seat 2 - left-center
        [800, 238],     // Seat 3 - top-center
        [1282.2, 535]    // Seat 4 - right-center
    ],
    6: [
        [800, 832],      // seat 1 bottom
        [317.8, 683.5],  // seat 2 lower-left
        [317.8, 386.5],  // seat 3 upper-left
        [800, 238],      // seat 4 top
        [1282.2, 386.5], // seat 5 upper-right
        [1282.2, 683.5]  // seat 6 lower-right
    ],
    9: [
        [800, 842],     // Seat 1 - bottom-center
        [575, 832],     // Seat 2 - bottom-left
        [295.9, 636.6], // Seat 3 - left arc +70deg
        [384.1, 307.5], // Seat 4 - left arc +140deg
        [680, 238],     // Seat 5 - top-left
        [920, 238],     // Seat 6 - top-right
        [1215.9, 307.5],// Seat 7 - right arc +140deg
        [1304.1, 636.6],// Seat 8 - right arc +70deg
        [1025, 832]     // Seat 9 - bottom-right
    ]
};

// Portrait seat rings on the 850×1600 stage: a vertical stadium (felt spans
// x 175–675, y 300–1300; end half-circles r=250 centred at y=550 and y=1050).
// Same seat ORDER as landscape — index 0 is the hero at 6 o'clock, then
// clockwise (lower-left, up the left side, across the top, down the right).
// Tuned against the felt rim the way the landscape spec seats are: side seats
// sit ON the straight rim, arc seats ~25px outside the end circles.
const PORTRAIT_SEAT_COORDS: Record<number, [number, number][]> = {
    2: [
        [425, 1300],    // hero
        [425, 275]      // cards just below the mobile chrome
    ],
    4: [
        [425, 1300],
        [175, 880],
        [425, 275],
        [675, 880]
    ],
    6: [
        [425, 1300],
        [175, 1045],
        [175, 555],
        [425, 275],
        [675, 555],
        [675, 1045]
    ],
    // Angular distribution matters on the narrow felt: the first cut put the
    // arc seats at ±45°, which left the 12-o'clock region empty and read as two
    // vertical columns. Arc seats now sit at ~±27° (top) / ~±38° (bottom) from
    // vertical on the end circles (r=250 + 25px outside), so the ring reads as
    // a ring. Hero stays alone at 6 o'clock.
    9: [
        [425, 1300],    // hero remains independent of the turn banner
        [188, 1182],    // lower arcs spread outward, clear of hero cards
        [175, 932],
        [175, 499],
        [303, 275],
        [547, 275],
        [675, 499],
        [675, 932],
        [662, 1182]
    ]
};

/** Seat coordinates for the current orientation's stage.
 *  Mobile landscape uses the desktop ring (these numbers do not change).
 *  stageToTable spreads that ring horizontally with the widened felt. */
export function getSeatCoords(tableSize: TableSize): [number, number][] {
    if (getStageOrientation() === "portrait") return PORTRAIT_SEAT_COORDS[tableSize];
    return SEAT_COORDS[tableSize];
}


// ─── Coordinate Conversion ───────────────────────────────────────────

/** Convert stage coordinates to table-div-relative pixel values.
 *  Mobile landscape scales X and Y about the table centre by the felt
 *  stretches, so seats, chips and dealer buttons spread with the stadium.
 *  Portrait scales Y only, about the same centre, so the ring grows taller
 *  without changing the felt's width. */
function stageToTable(stageX: number, stageY: number): [number, number] {
    const dims = getStageDims();
    let x = stageX;
    let y = stageY;
    const orientation = getStageOrientation();
    if (orientation === "mobile-landscape") {
        const widthStretch = dims.tableWidth / TABLE_WIDTH;
        const heightStretch = dims.tableHeight / TABLE_HEIGHT;
        x = dims.centerX + (stageX - dims.centerX) * widthStretch;
        y = dims.centerY + (stageY - dims.centerY) * heightStretch;
    } else if (orientation === "portrait") {
        const heightStretch = dims.tableHeight / STAGE_DIMS.portrait.tableHeight;
        y = dims.centerY + (stageY - dims.centerY) * heightStretch;
    }
    return [
        Math.round((x - dims.originX) * 10) / 10,
        Math.round((y - dims.originY) * 10) / 10
    ];
}

/** Convert stage coordinates to Position (left/top px strings) */
function stageToPosition(stageX: number, stageY: number, color?: string): Position {
    const [x, y] = stageToTable(stageX, stageY);
    return {
        left: `${x}px`,
        top: `${y}px`,
        ...(color ? { color } : {})
    };
}

// ─── Derivation Constants (tweak these to move ALL positions globally) ──

/** Scale factor for player components (cards, badges, chips, dealer button).
 *  Applied on top of the auto-fit zoom. 1.0 = default, 1.3 = 30% bigger.
 *  Doesn't affect positioning — just visual size around each element's center. */
export const COMPONENT_SCALE = 1.2;

/** How many extra pixels to push ALL seats outward from table center.
 *  Positive = further from center (seats spread out, table feels bigger).
 *  Negative = closer to center (seats tighter, table feels smaller).
 *  0 = spec positions from issue #142 (no change). */
const SEAT_SPREAD = -30;

/** How far chips sit from seat toward table center (0 = at seat, 1 = at center) */
const CHIP_DISTANCE = 0.42;

/** How many pixels down the turn animation ring sits below the seat coordinate.
 *  30px puts it on the badge center (player is 140px tall, centered via translate-y-50%). */
const TURN_ANIM_Y_OFFSET = 30;

/** Horizontal distance from the seat centre to each hole card's centre: the two
 *  60px cards overlap by 14px in HoleCardFan, so each is 23px off centre. */
const HOLE_CARD_DX = 23;

/** Vertical offset from the seat centre to the hole cards' centre. The 140px seat
 *  box is centred on the seat coordinate and the 80px card row is its first
 *  child, so the cards' centre sits 30px above the seat coordinate. */
const HOLE_CARD_DY = -30;

/**
 * The deck the hole cards are dealt from, in table-div coordinates (ui#21): the
 * felt centre, nudged above the community-card row so the cards visibly LEAVE
 * the board area. A single point, not per seat.
 */
export const DECK_ORIGIN: Position = { left: "500px", top: "150px" };

/** The deck origin for the current orientation's felt. */
export function getDeckOrigin(): Position {
    if (getStageOrientation() === "portrait") {
        const dims = getStageDims();
        // Same nudge above the unstretched felt centre (500, deck was 360).
        return { left: `${dims.tableWidth / 2}px`, top: `${dims.tableHeight / 2 - 140}px` };
    }
    if (getStageOrientation() === "mobile-landscape") {
        const dims = getStageDims();
        // Same nudge above the felt centre as the desktop deck (centre is 250, deck is 150).
        return { left: `${dims.tableWidth / 2}px`, top: `${dims.tableHeight / 2 - 100}px` };
    }
    return DECK_ORIGIN;
}

// ─── Position Generators ─────────────────────────────────────────────

export type TableSize = 2 | 4 | 6 | 9;


/** Push a seat position outward from table center by SEAT_SPREAD pixels */
function applySpread(sx: number, sy: number): [number, number] {
    // Portrait coordinates already include the approved rail/arc spacing.
    // Mobile landscape shares the desktop ring, including this spread.
    if (getStageOrientation() === "portrait") return [sx, sy];
    if ((SEAT_SPREAD as number) === 0) return [sx, sy];
    const dims = getStageDims();
    const dx = sx - dims.centerX;
    const dy = sy - dims.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return [sx, sy];
    return [sx + (dx / dist) * SEAT_SPREAD, sy + (dy / dist) * SEAT_SPREAD];
}

/** Get player seat positions for a given table size (with SEAT_SPREAD applied) */
export function getSeatPositions(tableSize: TableSize): Position[] {
    notePortraitSize(tableSize);
    const coords = getSeatCoords(tableSize);
    const colors = SEAT_COLORS[tableSize];
    return coords.map(([x, y], i) => {
        const [sx, sy] = applySpread(x, y);
        return stageToPosition(sx, sy, colors[i]);
    });
}

/** Get vacant seat positions (with SEAT_SPREAD applied) */
export function getVacantPositions(tableSize: TableSize): Position[] {
    const coords = getSeatCoords(tableSize);
    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        return stageToPosition(sx, sy);
    });
}

/**
 * Get chip positions derived from seat positions.
 * Chips sit between the seat and table center, inside the 900x350 surface div.
 * They use { left, bottom } instead of { left, top }.
 */
export function getChipPositions(tableSize: TableSize): ChipPosition[] {
    const dims = getStageDims();
    const coords = getSeatCoords(tableSize);

    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        // Vector from seat toward table center
        const dx = dims.centerX - sx;
        const dy = dims.centerY - sy;

        // Move CHIP_DISTANCE of the way from seat toward center
        const chipStageX = sx + dx * CHIP_DISTANCE;
        const chipStageY = sy + dy * CHIP_DISTANCE;

        // Convert to table-div-relative
        const [chipX] = stageToTable(chipStageX, chipStageY);

        // Chips are inside the felt surface div, using "bottom" positioning:
        // bottom = surface height - (chipStageY - originY)
        const chipRelY = chipStageY - dims.originY;
        const chipBottom = dims.tableHeight - chipRelY;

        return {
            left: `${Math.round(chipX)}px`,
            bottom: `${Math.round(chipBottom)}px`
        };
    });
}

/**
 * Get turn animation positions.
 * Placed at the seat with a slight downward offset for the ring animation.
 */
export function getTurnAnimationPositions(tableSize: TableSize): Position[] {
    const coords = getSeatCoords(tableSize);

    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        return stageToPosition(sx, sy + TURN_ANIM_Y_OFFSET);
    });
}

/**
 * Get win animation positions.
 * Same as seat positions (animation overlays the player).
 */
export function getWinAnimationPositions(tableSize: TableSize): Position[] {
    const coords = getSeatCoords(tableSize);
    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        return stageToPosition(sx, sy);
    });
}

/**
 * Get hole-card slot positions (ui#21): per seat, the centre of each of the two
 * cards the seat component draws, derived from the seat position with
 * HOLE_CARD_DX / HOLE_CARD_DY. Same seat order as {@link getSeatPositions}.
 */
export function getHoleCardSlotPositions(tableSize: TableSize): HoleCardSlotPosition[] {
    const coords = getSeatCoords(tableSize);
    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        return {
            first: stageToPosition(sx - HOLE_CARD_DX, sy + HOLE_CARD_DY),
            second: stageToPosition(sx + HOLE_CARD_DX, sy + HOLE_CARD_DY)
        };
    });
}

/** Pixel vector from one table-div position to another (for CSS translate offsets). */
export function positionDelta(from: Position, to: Position): { dx: number; dy: number } {
    return {
        dx: Math.round((parseFloat(to.left) - parseFloat(from.left)) * 10) / 10,
        dy: Math.round((parseFloat(to.top) - parseFloat(from.top)) * 10) / 10
    };
}

// ─── Fine-Tuning Offsets ─────────────────────────────────────────────
//
// Add entries here to nudge individual elements by a few pixels after
// visual QA. Leave empty by default — only add what needs adjustment.
//
// HOW TO USE:
//
// 1. Nudge seat 3's chips 5px left, 10px down on ALL screens:
//    GLOBAL_OFFSETS = { 9: { chips: { 3: { dx: -5, dy: 10 } } } }
//
// 2. Nudge seat 5's chips 8px up on MOBILE PORTRAIT only:
//    VIEWPORT_OFFSETS["mobile-portrait"] = { 9: { chips: { 5: { dy: -8 } } } }
//
//
// dx = horizontal (positive = right, negative = left)
// dy = vertical (positive = down, negative = up)

interface Offset { dx?: number; dy?: number; }

type ElementType = "players" | "vacantPlayers" | "chips" | "dealers"
                 | "turnAnimations" | "winAnimations" | "holeCards";

/** Global offsets — apply to all screen sizes */
const GLOBAL_OFFSETS: Partial<Record<TableSize,
    Partial<Record<ElementType, Record<number, Offset>>>>> = {
    2: {
        chips: {
            0: { dx: -38, dy: 40 },
            1: { dx: -38, dy: -5 }
        }
    },

    4: {
        chips: {
            0: { dx: -38, dy: 40 },    // seat 1
            1: { dx: -90, dy: 90 },  // seat 2
            2: { dx: -38, dy: -5 },  // seat 3
            3: { dx: 15, dy: 75 },   // seat 4
        }
    },

    6: {
        chips: {
            0: { dx: -38, dy: 40 },    // seat 1
            1: { dx: -92, dy: 20 },  // seat 2
            2: { dx: -92, dy: 28 },  // seat 3
            3: { dx: -40, dy: -7 },   // seat 4
            4: { dx: 18, dy: 15 },   // seat 5
            5: { dx: 18, dy: 20 }    // seat 6
        }
    },

    9: {
        chips: {
            0: { dx: -35, dy: 40 },         // seat 1
            1: { dx: -125, dy: 40 },       // seat 2
            2: { dx: -103, dy: -30 },   // seat 3
            3: { dx: -204, dy: 20 },      // seat 4
            4: { dx: -85, dy: -8 },      // seat 5
            5: { dx: 7, dy: -8 },       // seat 6
            6: { dx: 130, dy: 40 },     // seat 7
            7: { dx: 35, dy: -30 },    // seat 8
            8: { dx: 50, dy: 40 }         // seat 9
        }
    }
};


/** Per-viewport offsets — override for specific screen sizes only */
const VIEWPORT_OFFSETS: Partial<Record<ViewportMode, typeof GLOBAL_OFFSETS>> = {};

/** Portrait offsets are tuned independently — the landscape GLOBAL_OFFSETS were
 *  hand-fitted to the landscape seat ring and don't transfer. Nudge portrait
 *  elements here after visual QA (dy negative = up for chips too — the sign is
 *  normalized by applyChipOffsets). */
const PORTRAIT_GLOBAL_OFFSETS: typeof GLOBAL_OFFSETS = {
    // Hero (seat 1) bet chip was landing on the felt's bottom boundary — pull
    // it up toward the centre so it reads as "inside the felt, near the seat".
    2: { chips: { 0: { dy: -60 } } },
    4: { chips: { 0: { dy: -60 } } },
    6: { chips: { 0: { dy: -60 } } },
    9: { chips: { 0: { dy: -60 } } }
};

function globalOffsetsForOrientation(): typeof GLOBAL_OFFSETS {
    if (getStageOrientation() === "mobile-landscape") return {};
    return getStageOrientation() === "portrait" ? PORTRAIT_GLOBAL_OFFSETS : GLOBAL_OFFSETS;
}

/** Apply global + viewport offsets to a Position array */
function applyPositionOffsets(
    positions: Position[],
    tableSize: TableSize,
    element: ElementType
): Position[] {
    const mode = getViewportMode();
    const globalOffs = globalOffsetsForOrientation()[tableSize]?.[element];
    const vpOffs = VIEWPORT_OFFSETS[mode]?.[tableSize]?.[element];

    if (!globalOffs && !vpOffs) return positions;

    return positions.map((pos, i) => {
        const g = globalOffs?.[i];
        const v = vpOffs?.[i];
        if (!g && !v) return pos;

        const dx = (g?.dx ?? 0) + (v?.dx ?? 0);
        const dy = (g?.dy ?? 0) + (v?.dy ?? 0);

        return {
            ...pos,
            left: `${parseFloat(pos.left) + dx}px`,
            top: `${parseFloat(pos.top) + dy}px`
        };
    });
}

/** Apply global + viewport offsets to a ChipPosition array */
function applyChipOffsets(
    positions: ChipPosition[],
    tableSize: TableSize
): ChipPosition[] {
    const mode = getViewportMode();
    const globalOffs = globalOffsetsForOrientation()[tableSize]?.["chips"];
    const vpOffs = VIEWPORT_OFFSETS[mode]?.[tableSize]?.["chips"];

    if (!globalOffs && !vpOffs) return positions;

    return positions.map((pos, i) => {
        const g = globalOffs?.[i];
        const v = vpOffs?.[i];
        if (!g && !v) return pos;

        const dx = (g?.dx ?? 0) + (v?.dx ?? 0);
        const dy = (g?.dy ?? 0) + (v?.dy ?? 0);

        // Chips use "bottom" not "top", so dy inverts: positive dy = down = decrease bottom
        return {
            left: `${parseFloat(pos.left) + dx}px`,
            bottom: `${parseFloat(pos.bottom) - dy}px`
        };
    });
}

/** Apply global + viewport offsets to hole-card slots (both cards of a seat move together) */
function applyHoleCardOffsets(
    slots: HoleCardSlotPosition[],
    tableSize: TableSize
): HoleCardSlotPosition[] {
    const firsts = applyPositionOffsets(slots.map(slot => slot.first), tableSize, "holeCards");
    const seconds = applyPositionOffsets(slots.map(slot => slot.second), tableSize, "holeCards");
    return slots.map((_, i) => ({ first: firsts[i], second: seconds[i] }));
}

// ─── All Positions Bundle ────────────────────────────────────────────

export interface PositionArrays {
    players: Position[];
    vacantPlayers: Position[];
    chips: ChipPosition[];
    dealers: Position[];
    turnAnimations: Position[];
    winAnimations: Position[];
    /** Per seat, the two hole-card centres (ui#21 dealing animation targets). */
    holeCards: HoleCardSlotPosition[];
    /** The deck the hole cards fly from (a single point). */
    deck: Position;
}

/**
 * 9-seat mobile landscape only. Seat 2's widget is centred on the midpoint
 * between the right edge of seat 3 and the left edge of seat 1. Seat 9 is
 * centred between the right edge of seat 1 and the left edge of seat 8.
 * Every seat widget has the same width and is centred on its anchor, so
 * that midpoint is the midpoint of the neighbour anchors. Y stays put.
 * Portrait and desktop keep the spec ring.
 */
function centerMobileLandscapeWingSeats(positions: PositionArrays, tableSize: TableSize): PositionArrays {
    if (getStageOrientation() !== "mobile-landscape" || tableSize !== 9) return positions;
    const anchor = positions.players.map(seat => parseFloat(seat.left));
    const dx = new Map<number, number>([
        [1, (anchor[2] + anchor[0]) / 2 - anchor[1]],
        [8, (anchor[0] + anchor[7]) / 2 - anchor[8]]
    ]);
    const shift = (pos: Position, index: number): Position => {
        const delta = dx.get(index);
        if (!delta) return pos;
        const left = Math.round((parseFloat(pos.left) + delta) * 10) / 10;
        return { ...pos, left: `${left}px` };
    };
    return {
        ...positions,
        players: positions.players.map(shift),
        vacantPlayers: positions.vacantPlayers.map(shift),
        turnAnimations: positions.turnAnimations.map(shift),
        winAnimations: positions.winAnimations.map(shift),
        holeCards: positions.holeCards.map((slot, index) => ({
            first: shift(slot.first, index),
            second: shift(slot.second, index)
        })),
        chips: positions.chips.map((chip, index) => {
            const delta = dx.get(index);
            if (!delta) return chip;
            const left = Math.round((parseFloat(chip.left) + delta) * 10) / 10;
            return { ...chip, left: `${left}px` };
        })
    };
}

/** Get all position arrays for a given table size, with offsets applied */
export function getAllPositions(tableSize: TableSize): PositionArrays {
    notePortraitSize(tableSize);
    return centerMobileLandscapeWingSeats({
        players: applyPositionOffsets(getSeatPositions(tableSize), tableSize, "players"),
        vacantPlayers: applyPositionOffsets(getVacantPositions(tableSize), tableSize, "vacantPlayers"),
        chips: applyChipOffsets(getChipPositions(tableSize), tableSize),
        // The dealer button is anchored to the seat-number badge, not a felt coordinate.
        dealers: [],
        turnAnimations: applyPositionOffsets(getTurnAnimationPositions(tableSize), tableSize, "turnAnimations"),
        winAnimations: applyPositionOffsets(getWinAnimationPositions(tableSize), tableSize, "winAnimations"),
        holeCards: applyHoleCardOffsets(getHoleCardSlotPositions(tableSize), tableSize),
        deck: getDeckOrigin()
    }, tableSize);
}

// ─── Viewport Scaling ────────────────────────────────────────────────

export type ViewportMode = "mobile-portrait" | "mobile-landscape" | "tablet" | "desktop";

export function getViewportMode(): ViewportMode {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isCoarsePointer =
        typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

    // Portrait: aspect ratio + (coarse pointer OR narrow width). The coarse-pointer
    // test catches large phones (iPhone 14 Pro Max = 430px, Galaxy S24 = 412px,
    // Pixel Fold inner screen = 608px tall in portrait) reliably; the <768px arm
    // makes fine-pointer environments (narrow desktop windows, viewport-resized
    // automation without touch emulation) take the SAME code path as a real
    // phone instead of falling through to "tablet" and rendering the squashed
    // landscape stage.
    if (!isLandscape && (isCoarsePointer || width < 768)) return "mobile-portrait";

    // Landscape: coarse pointer up to 1700×900 CSS px — covers regular phones,
    // large Android flagships, and foldables (e.g. Galaxy Z Fold outer = 904px wide,
    // Pixel Fold inner = 1080px wide, future iPhone Fold ≈ 1100px wide in landscape).
    // The height<500 arm is the landscape twin of the portrait width<768 arm: an
    // iPhone 15 in landscape is 852px WIDE, so any width-based breakpoint calls
    // it desktop. Height is what's actually scarce — a sub-500px-tall landscape
    // window needs the compact treatment regardless of pointer type.
    const isCompactTouchLandscape = isLandscape && (isCoarsePointer || height < 500) && width <= 1700 && height <= 900;
    if (isCompactTouchLandscape) return "mobile-landscape";

    if (width <= 1024) return "tablet";
    return "desktop";
}

/**
 * Viewport parameters — PURE FUNCTIONAL.
 *
 * paddingH:      horizontal breathing room within the container (total, split left/right)
 * paddingV:      vertical breathing room within the container (total, split top/bottom)
 * footerOverlay: px height of any FIXED overlay footer that sits ON TOP of the container.
 *                Desktop/tablet retain a fixed footer. Mobile actions use measured
 *                normal flow, so the stage already excludes their full height.
 *
 * Container dimensions are MEASURED from the actual parent div (via ref),
 * not guessed from window.innerHeight. This eliminates all header/footer guesswork.
 */
export const VIEWPORT_PARAMS: Record<ViewportMode, {
    paddingH: number;
    paddingV: number;
    footerOverlay: number;
}> = {
    "desktop": {
        paddingH: 40,
        paddingV: 10,
        footerOverlay: 160      // footer is fixed h-[160px] overlay at bottom
    },
    "tablet": {
        paddingH: 40,
        paddingV: 10,
        footerOverlay: 160      // same as desktop
    },
    "mobile-landscape": {
        paddingH: 10,
        paddingV: 15,
        footerOverlay: 0        // the action column is beside the measured stage and always reserved
    },
    "mobile-portrait": {
        paddingH: 12,
        paddingV: 10,
        footerOverlay: 0        // the bottom dock is below the measured stage and always reserved
    }
};

const MIN_SCALE = 0.3;
const MAX_GLOBAL_SCALE = 2.0;

// ─── Auto-Fit: Dynamic Content Bounds ───────────────────────────────
//
// Calculates the bounding box from SEAT_COORDS for the current table size.
// Includes padding for player UI components that extend beyond seat points.
// 9-seat, 6-seat, and 2-seat tables all auto-fit correctly.

/**
 * Padding for player UI that extends beyond seat coordinate points.
 * x:      player component width extending left/right of outermost seats
 * top:    cards (80px) + component centering (70px) + margin above topmost seat
 * bottom: badge + stack + progress bar below bottommost seat
 */
export const PLAYER_UI_PADDING: Record<ViewportMode, { x: number; top: number; bottom: number }> = {
    "desktop":          { x: 80, top: 90, bottom: 90 },    // symmetric → perfectly centered between header and footer
    "tablet":           { x: 80, top: 120, bottom: 90 },
    "mobile-landscape": { x: 100, top: 70, bottom: 90 }, // shared mobile cards, stack and absolute timer
    "mobile-portrait":  { x: 110, top: 100, bottom: 135 }, // larger cards + absolute timer below the hero
};

export interface ContentBounds {
    width: number;
    height: number;
    centerX: number;   // content center in stage coords (for pixel-based positioning)
    centerY: number;
}

/** Calculate the bounding box + center of all seat positions + player UI.
 *  Uses per-viewport padding — desktop gets full room, mobile gets tighter fit. */
export function getContentBounds(tableSize: TableSize): ContentBounds {
    const mode = getViewportMode();
    const pad = PLAYER_UI_PADDING[mode];
    const coords = getSeatCoords(tableSize);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
        const [sx, sy] = applySpread(x, y);
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
    }
    // Heads-up seats have no horizontal span; include the actual felt/rail so
    // auto-fit cannot make a wide landscape table spill outside a short phone.
    // The width stretch already places the seat widgets inside the stage, so
    // the old 100px side pad is not added again (it left the dead space).
    let sidePad = pad.x;
    if (mode === "mobile-landscape") {
        const dims = getStageDims();
        minX = Math.min(minX, dims.originX - 30);
        maxX = Math.max(maxX, dims.originX + dims.tableWidth + 30);
        sidePad = 0;
    }
    return {
        width: (maxX - minX) + sidePad * 2,
        height: (maxY - minY) + pad.top + pad.bottom,
        // Center of the PADDED bounds (not just seats). Accounts for asymmetric
        // padding — more above (cards) than below (badges). Without this offset,
        // the top player cards get clipped by the header.
        centerX: (minX + maxX) / 2,
        centerY: ((minY - pad.top) + (maxY + pad.bottom)) / 2
    };
}

/**
 * Calculate zoom level to fit all content within the container.
 * containerWidth/Height come from the ACTUAL measured parent div (via ref).
 * Fixed desktop/tablet footer space is subtracted; mobile stage is already clear.
 */
export function calculateZoom(
    tableSize: TableSize,
    containerWidth: number,
    containerHeight: number
): number {
    const mode = getViewportMode();
    const params = VIEWPORT_PARAMS[mode];
    const bounds = getContentBounds(tableSize);

    // Usable space = container minus any fixed overlay minus breathing room.
    // Portrait needs no axis swap: the portrait stage is already vertical, so
    // its content bounds are taller than wide and fit the viewport directly.
    const usableWidth = containerWidth - params.paddingH;
    let usableHeight = containerHeight - params.footerOverlay - params.paddingV;
    if (mode === "mobile-landscape") usableHeight -= MOBILE_LANDSCAPE_ZOOM_RESERVE;
    if (mode === "mobile-portrait") usableHeight -= MOBILE_PORTRAIT_ZOOM_RESERVE;

    const scaleByWidth = usableWidth / bounds.width;
    const scaleByHeight = usableHeight / bounds.height;
    const fitScale = Math.min(scaleByWidth, scaleByHeight);

    // Short landscape screens (including browser chrome / keyboard) must still
    // fit the complete seat ring. A 0.3 floor previously forced it into controls.
    const minimum = mode.startsWith("mobile") ? 0.01 : MIN_SCALE;
    let result = Math.max(minimum, Math.min(fitScale, MAX_GLOBAL_SCALE));
    if (mode === "mobile-landscape") {
        result = Math.min(result, bannerZoomCap(containerWidth));
    }

    return result;
}

/** Unscaled vertical extent of one mobile-landscape ring, after the inward seat spread. */
function spreadSeatExtent(tableSize: TableSize): { topY: number; botY: number } {
    let topY = Infinity;
    let botY = -Infinity;
    for (const [x, y] of SEAT_COORDS[tableSize]) {
        const [, sy] = spreadForWidthCap(x, y);
        topY = Math.min(topY, sy);
        botY = Math.max(botY, sy);
    }
    return { topY, botY };
}

/**
 * Height scale actually applied on mobile landscape. Equals
 * {@link MOBILE_LANDSCAPE_HEIGHT_STRETCH} when the window has vertical room
 * under the header. Otherwise a smaller factor down to 1, so the top hole
 * cards keep {@link MOBILE_LANDSCAPE_TOP_GAP}px of air and the lowest action
 * box stays {@link MOBILE_LANDSCAPE_BOTTOM_GAP}px above the bottom edge. Zoom
 * stays the width-stretch fit: this does not shrink the table to buy height.
 */
export function mobileLandscapeHeightStretch(): number {
    const requested = Math.max(1, MOBILE_LANDSCAPE_HEIGHT_STRETCH);
    if (requested === 1 || typeof window === "undefined") return 1;
    if (getStageOrientation() !== "mobile-landscape") return 1;
    const params = VIEWPORT_PARAMS["mobile-landscape"];
    const containerW = window.innerWidth - 124;
    const containerH = window.innerHeight - MOBILE_LANDSCAPE_CHROME;
    const usableW = containerW - params.paddingH;
    const usableH = containerH - params.paddingV - MOBILE_LANDSCAPE_ZOOM_RESERVE;
    if (usableW <= 0 || usableH <= 0) return 1;
    const contentW = TABLE_WIDTH * mobileLandscapeWidthStretch() + 60;
    let allowed = requested;
    for (const size of [2, 4, 6, 9] as const) {
        const { topY, botY } = spreadSeatExtent(size);
        const span = botY - topY;
        const contentH = ringContentHeight(size);
        const zoom = Math.min(usableW / contentW, usableH / contentH, bannerZoomCap(containerW));
        if (zoom <= 0) return 1;
        const half = 35.5 * parseFloat(mobileCardUnit(false, zoom, containerW, containerH));
        const limit = (containerH - MOBILE_LANDSCAPE_TOP_GAP - MOBILE_LANDSCAPE_BOTTOM_GAP) / zoom;
        // The banner hangs below the cards. Reserving it shortens the felt and
        // pulls the bottom seats up; the nudge then keeps the top cards put.
        const maxH = (limit - 2 * half - MOBILE_LANDSCAPE_ACTION_BELOW_CARDS) / span;
        allowed = Math.min(allowed, maxH);
    }
    return Math.min(requested, Math.max(1, allowed));
}

/**
 * Height scale actually applied on mobile portrait. Equals
 * {@link MOBILE_PORTRAIT_HEIGHT_STRETCH} when the phone has vertical room.
 * Otherwise a smaller factor down to 1, so the top hole cards keep
 * {@link MOBILE_PORTRAIT_TOP_GAP}px of air under the header and the hero's
 * action banner stays {@link MOBILE_PORTRAIT_BOTTOM_GAP}px above the dock.
 * Zoom stays the unstretched fit, so the felt does not grow wider. The
 * factor follows the table currently being laid out, because a wider ring
 * zooms down and needs a taller felt to meet the same gaps.
 */
export function mobilePortraitHeightStretch(): number {
    const requested = Math.max(1, MOBILE_PORTRAIT_HEIGHT_STRETCH);
    if (requested === 1 || typeof window === "undefined") return 1;
    if (getStageOrientation() !== "portrait") return 1;
    const stageH = window.innerHeight - MOBILE_PORTRAIT_HEADER - MOBILE_PORTRAIT_DOCK;
    const containerW = window.innerWidth;
    if (stageH <= 0 || containerW <= 0) return 1;
    const sizes: readonly TableSize[] = activePortraitSize ? [activePortraitSize] : [2, 4, 6, 9];
    let allowed = requested;
    for (const size of sizes) {
        const zoom = calculateZoom(size, containerW, stageH);
        if (zoom <= 0) return 1;
        const half = 35.5 * parseFloat(mobileCardUnit(true, zoom, containerW, stageH));
        const maxS = ((stageH - MOBILE_PORTRAIT_TOP_GAP - MOBILE_PORTRAIT_BOTTOM_GAP) / zoom
            - 2 * half
            - MOBILE_LANDSCAPE_ACTION_BELOW_CARDS) / PORTRAIT_SEAT_SPAN;
        allowed = Math.min(allowed, maxS);
    }
    return Math.min(requested, Math.max(1, allowed));
}

/**
 * Build CSS transform — pixel-based, no percentages.
 * Centers the content within the measured container.
 * CSS wrapper must have: top:0; left:0; transform-origin: 0 0;
 * Mobile landscape then slides the ring so the top hole cards sit
 * {@link MOBILE_LANDSCAPE_TOP_GAP}px under the stage top, unless that would
 * push the lowest action box past the bottom edge. Mobile portrait does the
 * same with its own gaps, so the hero banner stops above the action dock.
 */
export function getTableTransform(
    zoom: number,
    tableSize: TableSize,
    containerWidth: number,
    containerHeight: number,
    horizontalOffset: number = 0
): string {
    notePortraitSize(tableSize);
    const mode = getViewportMode();
    const params = VIEWPORT_PARAMS[mode];
    const bounds = getContentBounds(tableSize);

    // Center of the usable area within the container
    const usableCenterX = containerWidth / 2;
    const usableCenterY = (containerHeight - params.footerOverlay) / 2;

    // Content center after scaling (transform-origin: 0 0).
    // Portrait needs no special case: the portrait stage is natively vertical
    // (the old rotate-90 matrix rendered every seat label sideways and is gone).
    const scaledCenterX = bounds.centerX * zoom;
    const scaledCenterY = bounds.centerY * zoom;

    // A fixed room-layout bias must not clip the seats or change the table scale.
    const spareSideSpace = Math.max(0, (containerWidth - bounds.width * zoom) / 2 - 12);
    const safeOffset = Math.max(-spareSideSpace, Math.min(spareSideSpace, horizontalOffset));
    const tx = usableCenterX - scaledCenterX + safeOffset;
    let ty = usableCenterY - scaledCenterY;
    if (mode === "mobile-landscape") {
        ty += mobileLandscapeVerticalNudge(zoom, containerWidth, containerHeight, tableSize, ty);
    }
    if (mode === "mobile-portrait") {
        ty += mobilePortraitVerticalNudge(zoom, containerWidth, containerHeight, tableSize, ty);
    }

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom})`;
}

/** Slide the centred ring so the top cards sit just under the stage top. */
function mobileLandscapeVerticalNudge(
    zoom: number,
    containerWidth: number,
    containerHeight: number,
    tableSize: TableSize,
    ty: number
): number {
    const dims = getStageDims();
    const half = 35.5 * parseFloat(mobileCardUnit(false, zoom, containerWidth, containerHeight));
    const seats = getSeatPositions(tableSize);
    let cardTop = Infinity;
    let actionBottom = -Infinity;
    for (const seat of seats) {
        const stageY = dims.originY + parseFloat(seat.top);
        cardTop = Math.min(cardTop, stageY - half);
        actionBottom = Math.max(actionBottom, stageY + half + MOBILE_LANDSCAPE_ACTION_BELOW_CARDS);
    }
    let nudge = MOBILE_LANDSCAPE_TOP_GAP - (ty + cardTop * zoom);
    const actionAfter = ty + nudge + actionBottom * zoom;
    const limit = containerHeight - MOBILE_LANDSCAPE_BOTTOM_GAP;
    if (actionAfter > limit) nudge -= actionAfter - limit;
    return nudge;
}

/** Slide the centred portrait ring so the top cards sit just under the stage top. */
function mobilePortraitVerticalNudge(
    zoom: number,
    containerWidth: number,
    containerHeight: number,
    tableSize: TableSize,
    ty: number
): number {
    const dims = getStageDims();
    const half = 35.5 * parseFloat(mobileCardUnit(true, zoom, containerWidth, containerHeight));
    const seats = getSeatPositions(tableSize);
    let cardTop = Infinity;
    let actionBottom = -Infinity;
    for (const seat of seats) {
        const stageY = dims.originY + parseFloat(seat.top);
        cardTop = Math.min(cardTop, stageY - half);
        actionBottom = Math.max(actionBottom, stageY + half + MOBILE_LANDSCAPE_ACTION_BELOW_CARDS);
    }
    let nudge = MOBILE_PORTRAIT_TOP_GAP - (ty + cardTop * zoom);
    const actionAfter = ty + nudge + actionBottom * zoom;
    const limit = containerHeight - MOBILE_PORTRAIT_BOTTOM_GAP;
    if (actionAfter > limit) nudge -= actionAfter - limit;
    return nudge;
}
