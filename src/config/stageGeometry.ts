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
 *    Chips, dealer buttons, and animations are calculated from seat positions:
 *      - Chips:      40% from seat toward table center (adjust CHIP_DISTANCE)
 *      - Dealer:     30% from seat toward table center (adjust DEALER_DISTANCE)
 *      - Turn anim:  seat position + 80px down (adjust TURN_ANIM_Y_OFFSET)
 *      - Win anim:   same as seat position
 *
 * 4. VIEWPORT SCALING
 *    Positions are FIXED on the table. Screen-size adaptation is handled by
 *    zoom/scale on the table container (calculateZoom + getTableTransform).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HOW TO FINE-TUNE POSITIONS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * To move ALL chips/dealers/animations globally:
 *   → Change the distance constants: CHIP_DISTANCE, DEALER_DISTANCE, TURN_ANIM_Y_OFFSET
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
 * How much wider the mobile-landscape felt is than the desktop 2:1 stadium.
 * Tune this one number: 1 keeps 1000×500 (aspect 2:1), 1.15 paints 1150×500
 * (aspect 2.3:1). `mobileLandscapeWidthStretch` may lower it when the window
 * is too narrow to keep the zoom height-limited. It never raises it and never
 * goes below 1, so the felt cannot become the old very-wide shape.
 */
export const MOBILE_LANDSCAPE_WIDTH_STRETCH = 1.15;
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
    // widens it in stageDimsFor (MOBILE_LANDSCAPE_WIDTH_STRETCH) and still
    // uniform-scales the stage; portrait and desktop read these numbers as-is.
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
    if (dist === 0 || SEAT_SPREAD === 0) return [sx, sy];
    return [sx + (dx / dist) * SEAT_SPREAD, sy + (dy / dist) * SEAT_SPREAD];
}

/** Shortest mobile-landscape content height (2/4/6/9). The short ring binds first. */
function mobileLandscapeContentHeight(): number {
    const pad = PLAYER_UI_PADDING["mobile-landscape"];
    let shortest = Infinity;
    for (const size of [2, 4, 6, 9] as const) {
        let minY = Infinity;
        let maxY = -Infinity;
        for (const [x, y] of SEAT_COORDS[size]) {
            const [, sy] = spreadForWidthCap(x, y);
            minY = Math.min(minY, sy);
            maxY = Math.max(maxY, sy);
        }
        shortest = Math.min(shortest, (maxY - minY) + pad.top + pad.bottom);
    }
    return shortest;
}

/**
 * Stretch actually applied on mobile landscape. Equals
 * {@link MOBILE_LANDSCAPE_WIDTH_STRETCH} when the window can spare the width,
 * otherwise a smaller factor down to 1 (the 2:1 felt). The estimate reserves
 * the 124px action column and the ~70px header the stage sits under.
 */
export function mobileLandscapeWidthStretch(): number {
    const requested = Math.max(1, MOBILE_LANDSCAPE_WIDTH_STRETCH);
    if (requested === 1 || typeof window === "undefined") return 1;
    const params = VIEWPORT_PARAMS["mobile-landscape"];
    const usableW = window.innerWidth - 124 - params.paddingH;
    const usableH = window.innerHeight - 70 - params.paddingV;
    if (usableW <= 0 || usableH <= 0) return 1;
    const scaleByHeight = usableH / mobileLandscapeContentHeight();
    if (scaleByHeight <= 0) return 1;
    const padX = PLAYER_UI_PADDING["mobile-landscape"].x * 2;
    const maxContentWidth = usableW / scaleByHeight;
    const maxStretch = (maxContentWidth - 60 - padX) / TABLE_WIDTH;
    return Math.min(requested, Math.max(1, maxStretch));
}

/** Felt dimensions for one orientation. Mobile landscape is the only stretched stage. */
export function stageDimsFor(orientation: StageOrientation): StageDims {
    const base = STAGE_DIMS[orientation];
    if (orientation !== "mobile-landscape") return base;
    const tableWidth = TABLE_WIDTH * mobileLandscapeWidthStretch();
    return {
        ...base,
        tableWidth,
        originX: TABLE_CENTER_X - tableWidth / 2
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
 *  Mobile landscape scales X about the table centre by the felt stretch, so
 *  seats, chips and dealer buttons spread with the wider stadium. Y is unchanged. */
function stageToTable(stageX: number, stageY: number): [number, number] {
    const dims = getStageDims();
    let x = stageX;
    if (getStageOrientation() === "mobile-landscape") {
        const stretch = dims.tableWidth / TABLE_WIDTH;
        x = dims.centerX + (stageX - dims.centerX) * stretch;
    }
    return [
        Math.round((x - dims.originX) * 10) / 10,
        Math.round((stageY - dims.originY) * 10) / 10
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

/** How far dealer button sits from seat toward table center.
 *  0.5 = halfway between seat and center — ensures button is ON the table surface
 *  for all seats including top (5,6) and edge (7,8) positions. */
const DEALER_DISTANCE = 0.34;

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

/** Portrait counterpart of {@link DECK_ORIGIN}: felt centre (250) nudged above
 *  the community-card row on the 500×1000 portrait felt. */
const PORTRAIT_DECK_ORIGIN: Position = { left: "250px", top: "360px" };

/** The deck origin for the current orientation's felt. */
export function getDeckOrigin(): Position {
    if (getStageOrientation() === "portrait") return PORTRAIT_DECK_ORIGIN;
    if (getStageOrientation() === "mobile-landscape") {
        return { left: `${getStageDims().tableWidth / 2}px`, top: DECK_ORIGIN.top };
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
 * Get dealer button positions.
 * Placed between seat and table edge, offset toward table center.
 */
export function getDealerPositions(tableSize: TableSize): Position[] {
    const dims = getStageDims();
    const coords = getSeatCoords(tableSize);

    return coords.map(([x, y]) => {
        const [sx, sy] = applySpread(x, y);
        const dx = dims.centerX - sx;
        const dy = dims.centerY - sy;

        // Move DEALER_DISTANCE from seat toward center
        const dealerX = sx + dx * DEALER_DISTANCE;
        const dealerY = sy + dy * DEALER_DISTANCE;

        return stageToPosition(dealerX, dealerY);
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
// 3. Move dealer button for seat 7 right 10px on tablet:
//    VIEWPORT_OFFSETS["tablet"] = { 9: { dealers: { 7: { dx: 10 } } } }
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
        dealers: {
            0: { dx: 95, dy: 63 },
            1: { dx: 95, dy: -20 }
        },
        chips: {
            0: { dx: -38, dy: 40 },
            1: { dx: -38, dy: -5 }
        }
    },

    4: {
        dealers: {
            0: { dx: 95, dy: 63 },    // seat 1
            1: { dx: -57, dy: -2 },  // seat 2
            2: { dx: 95, dy: -20 }, // seat 3
            3: { dx: 60, dy: 24 },   // seat 4
            },
        chips: {
            0: { dx: -38, dy: 40 },    // seat 1
            1: { dx: -90, dy: 90 },  // seat 2
            2: { dx: -38, dy: -5 },  // seat 3
            3: { dx: 15, dy: 75 },   // seat 4
        }
    },

    6: {
        dealers: {
            0: { dx: 95, dy: 63 },    // seat 1
            1: { dx: -60, dy: 23 },  // seat 2
            2: { dx: -60, dy: -73 }, // seat 3
            3: { dx: 95, dy: -20 },   // seat 4
            4: { dx: 60, dy: -23 },  // seat 5
            5: { dx: 60, dy: 73 }    // seat 6
        },
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
        dealers: {
            0: { dx: 95, dy: 65 },   // seat 1
            1: { dx: 25, dy: 115 },   // seat 2
            2: { dx: -68, dy: 7},   // seat 3
            3: { dx: -38, dy: 0 },  // seat 4
            4: { dx: 58, dy: -19 },  // seat 5
            5: { dx: 132, dy: -19 }, // seat 6
            6: { dx: 39, dy: -48 },   // seat 7
            7: { dx: 68, dy: 57 },    // seat 8
            8: { dx: 165, dy: 115 }   // seat 9
        },
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
const VIEWPORT_OFFSETS: Partial<Record<ViewportMode, typeof GLOBAL_OFFSETS>> = {
    "desktop": {
        9: {
            dealers: {
                1: { dy: -50 },  // D2 — move up so it's above the chips
                8: { dy: -50 },  // D9
            }
        }
    },
    "mobile-landscape": {
        9: {
            dealers: {
                1: { dy: -40 },  // D2
                8: { dy: -40 },  // D9
            }
        }
    }
};

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

/** Get all position arrays for a given table size, with offsets applied */
export function getAllPositions(tableSize: TableSize): PositionArrays {
    return {
        players: applyPositionOffsets(getSeatPositions(tableSize), tableSize, "players"),
        vacantPlayers: applyPositionOffsets(getVacantPositions(tableSize), tableSize, "vacantPlayers"),
        chips: applyChipOffsets(getChipPositions(tableSize), tableSize),
        dealers: applyPositionOffsets(getDealerPositions(tableSize), tableSize, "dealers"),
        turnAnimations: applyPositionOffsets(getTurnAnimationPositions(tableSize), tableSize, "turnAnimations"),
        winAnimations: applyPositionOffsets(getWinAnimationPositions(tableSize), tableSize, "winAnimations"),
        holeCards: applyHoleCardOffsets(getHoleCardSlotPositions(tableSize), tableSize),
        deck: getDeckOrigin()
    };
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
    if (mode === "mobile-landscape") {
        const dims = getStageDims();
        minX = Math.min(minX, dims.originX - 30);
        maxX = Math.max(maxX, dims.originX + dims.tableWidth + 30);
    }
    return {
        width: (maxX - minX) + pad.x * 2,
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
    const usableHeight = containerHeight - params.footerOverlay - params.paddingV;

    const scaleByWidth = usableWidth / bounds.width;
    const scaleByHeight = usableHeight / bounds.height;
    const fitScale = Math.min(scaleByWidth, scaleByHeight);

    // Short landscape screens (including browser chrome / keyboard) must still
    // fit the complete seat ring. A 0.3 floor previously forced it into controls.
    const minimum = mode.startsWith("mobile") ? 0.01 : MIN_SCALE;
    const result = Math.max(minimum, Math.min(fitScale, MAX_GLOBAL_SCALE));

    return result;
}

/**
 * Build CSS transform — pixel-based, no percentages.
 * Centers the content within the measured container.
 * CSS wrapper must have: top:0; left:0; transform-origin: 0 0;
 */
export function getTableTransform(
    zoom: number,
    tableSize: TableSize,
    containerWidth: number,
    containerHeight: number,
    horizontalOffset: number = 0
): string {
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
    const ty = usableCenterY - scaledCenterY;

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom})`;
}
