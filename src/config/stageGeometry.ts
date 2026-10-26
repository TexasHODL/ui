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
 *      - Dealer:     on the seat->centre ray, just clear of the pod and the bet (ui#835)
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
 *   → Change the distance constants: CHIP_DISTANCE, DEALER_POD_GAP, TURN_ANIM_Y_OFFSET
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

export type StageOrientation = "landscape" | "portrait";

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
    return getViewportMode() === "mobile-portrait" ? "portrait" : "landscape";
}

export function getStageDims(): StageDims {
    return STAGE_DIMS[getStageOrientation()];
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
        [425, 1362],    // seat 1 bottom
        [425, 238]      // seat 2 top
    ],
    4: [
        [425, 1362],    // Seat 1 - bottom-center
        [170, 800],     // Seat 2 - left-center
        [425, 238],     // Seat 3 - top-center
        [680, 800]      // Seat 4 - right-center
    ],
    6: [
        [425, 1362],    // seat 1 bottom
        [170, 1075],    // seat 2 lower-left
        [170, 525],     // seat 3 upper-left
        [425, 238],     // seat 4 top
        [680, 525],     // seat 5 upper-right
        [680, 1075]     // seat 6 lower-right
    ],
    // Angular distribution matters on the narrow felt: the first cut put the
    // arc seats at ±45°, which left the 12-o'clock region empty and read as two
    // vertical columns. Arc seats now sit at ~±27° (top) / ~±38° (bottom) from
    // vertical on the end circles (r=250 + 25px outside), so the ring reads as
    // a ring. Hero stays alone at 6 o'clock.
    9: [
        [425, 1362],    // Seat 1 - bottom-center (hero, alone on the bottom arc)
        [256, 1267],    // Seat 2 - lower-left arc (~38° from vertical)
        [170, 985],     // Seat 3 - left side, lower
        [170, 615],     // Seat 4 - left side, upper
        [300, 305],     // Seat 5 - upper-left arc (~27° from vertical)
        [550, 305],     // Seat 6 - upper-right arc (~27° from vertical)
        [680, 615],     // Seat 7 - right side, upper
        [680, 985],     // Seat 8 - right side, lower
        [594, 1267]     // Seat 9 - lower-right arc (~38° from vertical)
    ]
};

/** Seat coordinates for the current orientation's stage. */
export function getSeatCoords(tableSize: TableSize): [number, number][] {
    return getStageOrientation() === "portrait" ? PORTRAIT_SEAT_COORDS[tableSize] : SEAT_COORDS[tableSize];
}


// ─── Coordinate Conversion ───────────────────────────────────────────

/** Convert stage coordinates to table-div-relative pixel values */
function stageToTable(stageX: number, stageY: number): [number, number] {
    const dims = getStageDims();
    return [
        Math.round((stageX - dims.originX) * 10) / 10,
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

/** How many pixels down the turn animation ring sits below the seat coordinate.
 *  30px puts it on the badge center (player is 140px tall, centered via translate-y-50%). */
const TURN_ANIM_Y_OFFSET = 30;

/** Horizontal distance from the seat centre to each hole card's centre: the two
 *  60px cards sit side by side with a 4px gap, so each is 32px off centre. */
const HOLE_CARD_DX = 32;

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
    return getStageOrientation() === "portrait" ? PORTRAIT_DECK_ORIGIN : DECK_ORIGIN;
}

// ─── Position Generators ─────────────────────────────────────────────

export type TableSize = 2 | 4 | 6 | 9;


/** Push a seat position outward from table center by SEAT_SPREAD pixels */
function applySpread(sx: number, sy: number): [number, number] {
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

/** Seat pod footprint (Player/VacantPlayer: 160x140 box centred on the seat). */
export const POD_HALF_WIDTH = 80;
export const POD_HALF_HEIGHT = 70;

/** Dealer button diameter (Table.tsx renders it w-12 h-12). */
export const DEALER_BUTTON_SIZE = 48;

/** Clear felt between the pod edge and the button edge. */
const DEALER_POD_GAP = 12;

/** Approximate bet-chip pill footprint in table units, anchored at its
 *  left/bottom corner (PlayerChipDisplay). Mobile chips use larger text, so
 *  they cover more felt. Used only to keep the dealer button off the bet. */
export function getChipFootprint(): { width: number; height: number } {
    const mode = getViewportMode();
    return mode === "mobile-portrait" || mode === "mobile-landscape" ? { width: 175, height: 44 } : { width: 130, height: 40 };
}

/** Max sideways slide (table units) when the seat's own bet sits on the ray. */
const DEALER_MAX_SLIDE = 120;

/** Never push the button further than this fraction of seat->centre. */
const DEALER_MAX_DISTANCE = 0.62;

export interface Rect { left: number; top: number; right: number; bottom: number; }

/** Community cards + total-pot label keep-out (table-div coords). */
export function getBoardRect(): Rect {
    const dims = getStageDims();
    const cx = dims.centerX - dims.originX;
    const cy = dims.centerY - dims.originY;
    const portrait = getStageOrientation() === "portrait";
    return portrait
        ? { left: cx - 205, top: cy - 95, right: cx + 205, bottom: cy + 85 }
        : { left: cx - 205, top: cy - 75, right: cx + 205, bottom: cy + 60 };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Chip pill rectangle (table-div coords) for a { left, bottom } chip position. */
export function chipRect(chip: ChipPosition): Rect {
    const dims = getStageDims();
    const left = parseFloat(chip.left);
    const bottomEdge = dims.tableHeight - parseFloat(chip.bottom);
    const fp = getChipFootprint();
    return { left, top: bottomEdge - fp.height, right: left + fp.width, bottom: bottomEdge };
}

/** Seat pod rectangle (table-div coords) for a seat centre position. */
export function podRect(seat: Position): Rect {
    const x = parseFloat(seat.left);
    const y = parseFloat(seat.top);
    return { left: x - POD_HALF_WIDTH, top: y - POD_HALF_HEIGHT, right: x + POD_HALF_WIDTH, bottom: y + POD_HALF_HEIGHT };
}

/** Dealer button rectangle (table-div coords) for a centred dealer position. */
export function dealerRect(dealer: Position): Rect {
    const x = parseFloat(dealer.left);
    const y = parseFloat(dealer.top);
    const r = DEALER_BUTTON_SIZE / 2;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r };
}

/**
 * Which side of the pod the NFT avatar goes on (ui#835): the OUTER side,
 * i.e. away from the table centre. Seats left of centre get it on the left;
 * right-of-centre and centre-column seats (hero, top) keep it on the right.
 */
export function getAvatarSide(seatLeft: string | undefined): "left" | "right" {
    const x = parseFloat(seatLeft ?? "");
    if (!Number.isFinite(x)) return "right";
    return x < getStageDims().tableWidth / 2 - 1 ? "left" : "right";
}

/**
 * Get dealer button positions (ui#835).
 *
 * The button is a felt token, not part of the avatar pod: it sits on the
 * straight line from the seat to the table centre, just past the pod edge, so
 * it is always "in front of" the button player and reads the same from every
 * seat as it rotates. There are no per-seat sideways nudges and no left/right
 * flipping. If the seat's own bet chip is on that line, the button slides
 * further toward the pot until it clears it.
 *
 * @param chips final chip positions (with offsets) to avoid; optional.
 */
export function getDealerPositions(tableSize: TableSize, chips?: ChipPosition[]): Position[] {
    const dims = getStageDims();
    const coords = getSeatCoords(tableSize);
    const [cx, cy] = stageToTable(dims.centerX, dims.centerY);
    const r = DEALER_BUTTON_SIZE / 2;
    const pods = getSeatPositions(tableSize).map(podRect);

    return coords.map(([x, y], i) => {
        const [ssx, ssy] = applySpread(x, y);
        const [sx, sy] = stageToTable(ssx, ssy);
        const vx = cx - sx;
        const vy = cy - sy;
        const len = Math.hypot(vx, vy);
        if (len === 0) return stageToPosition(ssx, ssy);
        const ux = vx / len;
        const uy = vy / len;

        // Distance along the ray at which it leaves the pod rectangle.
        const exitX = Math.abs(ux) > 1e-6 ? POD_HALF_WIDTH / Math.abs(ux) : Infinity;
        const exitY = Math.abs(uy) > 1e-6 ? POD_HALF_HEIGHT / Math.abs(uy) : Infinity;
        // The button is a square-ish token: its far corner must clear the pod too.
        const clearance = r * (Math.abs(ux) + Math.abs(uy));
        const minT = Math.min(exitX, exitY) + DEALER_POD_GAP + clearance;
        const maxT = Math.max(minT, len * DEALER_MAX_DISTANCE);

        // t = distance along the ray; s = sideways slide (perpendicular).
        const at = (t: number, s = 0): Position => ({
            left: `${Math.round((sx + ux * t - uy * s) * 10) / 10}px`,
            top: `${Math.round((sy + uy * t + ux * s) * 10) / 10}px`
        });

        const avoid: Rect[] = [getBoardRect(), ...pods];
        if (chips?.[i]) avoid.push(chipRect(chips[i]));
        const clear = (pos: Position) => {
            const r = dealerRect(pos);
            return avoid.every(a => !rectsOverlap(r, a));
        };

        // Search the felt in front of the pod (t = distance along the ray,
        // s = sideways slide) and take the clear spot nearest to "just in front
        // of the pod". Sliding is penalised so the button stays on the ray
        // whenever it can. Deterministic per seat geometry, no side flipping.
        let best: Position | null = null;
        let bestCost = Infinity;
        for (let t = minT; t <= maxT; t += 2) {
            for (let s = -DEALER_MAX_SLIDE; s <= DEALER_MAX_SLIDE; s += 2) {
                const cost = (t - minT) + 1.5 * Math.abs(s);
                if (cost >= bestCost) continue;
                const pos = at(t, s);
                if (clear(pos)) {
                    best = pos;
                    bestCost = cost;
                }
            }
        }
        if (best) return best;
        return at(minT);
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
// The dealer button is no longer offset per seat or per viewport (ui#835): it is
// derived on the seat->centre ray in getDealerPositions.
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
    const chips = applyChipOffsets(getChipPositions(tableSize), tableSize);
    return {
        players: applyPositionOffsets(getSeatPositions(tableSize), tableSize, "players"),
        vacantPlayers: applyPositionOffsets(getVacantPositions(tableSize), tableSize, "vacantPlayers"),
        chips,
        dealers: getDealerPositions(tableSize, chips),
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
 *                Only mobile-landscape has this (80px fixed footer). All other viewports
 *                have the footer in normal flex flow, so the container already excludes it.
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
        footerOverlay: 80       // mobile landscape footer is 80px
    },
    "mobile-portrait": {
        paddingH: 12,
        paddingV: 10,
        footerOverlay: 90       // no persistent footer bar — just clearance for the
                                // on-demand action overlay + safe area at the bottom
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
    "mobile-landscape": { x: 40, top: 80, bottom: 60 },    // extra top for browser chrome
    "mobile-portrait":  { x: 70, top: 90, bottom: 90 },    // symmetric — vertical stadium, hero at the bottom
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
 * footerOverlay is subtracted for mobile-landscape where the footer overlays the container.
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

    const result = Math.max(MIN_SCALE, Math.min(fitScale, MAX_GLOBAL_SCALE));

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
    containerHeight: number
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

    const tx = usableCenterX - scaledCenterX;
    const ty = usableCenterY - scaledCenterY;

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom})`;
}
