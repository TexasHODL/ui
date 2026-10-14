import { mobileCardUnit } from "./mobileCardSizing";
import { getContentBounds, getSeatCoords, getStageDims, type PositionArrays, type TableSize } from "./stageGeometry";

/** Reserve the timer even when hidden, so changing turns never moves a seat. */
export function alignLandscapeSeatEdges(positions: PositionArrays, size: TableSize, width: number, height: number, zoom: number): PositionArrays {
    const unit = parseFloat(mobileCardUnit(false, zoom, width, height)) * zoom;
    const top = 4 + 39 * unit;
    const bottom = height - 4 - 54 * unit;
    const dims = getStageDims();
    const ty = Number((height / 2 - getContentBounds(size).centerY * zoom).toFixed(1));
    const ys = positions.players.map(p => parseFloat(p.top));
    const min = Math.min(...ys), max = Math.max(...ys);
    const offsets = ys.map((y, i) => {
        const lift = size === 9 && (i === 1 || i === 8) ? 10 * unit : 0;
        const target = top + (y - min) / (max - min) * (bottom - top) - lift;
        return (target - ty) / zoom - dims.originY - y;
    });
    const move = <T extends { top: string }>(p: T, i: number): T => ({ ...p, top: `${parseFloat(p.top) + offsets[i]}px` });
    return {
        ...positions,
        players: positions.players.map(move),
        vacantPlayers: positions.vacantPlayers.map(move),
        chips: positions.chips.map((p, i) => ({ ...p, bottom: `${parseFloat(p.bottom) - offsets[i]}px` })),
        dealers: positions.dealers.map(move),
        turnAnimations: positions.turnAnimations.map(move),
        winAnimations: positions.winAnimations.map(move),
        holeCards: positions.holeCards.map((p, i) => ({ first: move(p.first, i), second: move(p.second, i) }))
    };
}

/**
 * How far the mobile-landscape felt must scale around its centre so its rail
 * meets the seat ring. Seats are already stretched to the screen; this does
 * not move them. `shiftY` is the table-space nudge that keeps the scaled
 * centre on the stretched ring's centre.
 */
export function landscapeFeltStretch(positions: PositionArrays, size: TableSize): { scaleY: number; shiftY: number } {
    const dims = getStageDims();
    const original = getSeatCoords(size).map(([, y]) => y - dims.originY);
    const oMin = Math.min(...original);
    const oMax = Math.max(...original);
    const span = oMax - oMin;
    if (span <= 0) return { scaleY: 1, shiftY: 0 };
    const tops = positions.players.map(seat => parseFloat(seat.top));
    const min = Math.min(...tops);
    const max = Math.max(...tops);
    return {
        scaleY: (max - min) / span,
        shiftY: (min + max) / 2 - (oMin + oMax) / 2
    };
}

interface KeepOut {
    x: number;
    y: number;
    hw: number;
    hy: number;
    /** A watermark. Markers avoid it when a spot near the rail still exists. */
    soft?: boolean;
}

function boxesOverlap(a: KeepOut, b: KeepOut, gap: number): boolean {
    return Math.abs(a.x - b.x) < a.hw + b.hw + gap && Math.abs(a.y - b.y) < a.hy + b.hy + gap;
}

/**
 * Community cards, the pot and the club logo, in table-div pixels. The board
 * stays centred on the unscaled felt; portrait shifts the card row the same
 * way mobileReadability.css does.
 */
function mobileBoardKeepOut(size: TableSize, unitStage: number, portrait: boolean): KeepOut[] {
    const dims = getStageDims();
    const cx = dims.tableWidth / 2;
    const mid = dims.tableHeight / 2;
    const rowW = (5 * 39 + 4 * 3) * unitStage;
    const rowH = (39 * 805 / 550) * unitStage;
    // The pot label is the 28px (or 20px) pill under or above the cards.
    // Width tracks the measured "Total Pot" label, not the whole card row.
    // Portrait's 28px pill measures taller than the landscape one.
    const potH = portrait ? 56 : 42;
    const potW = rowW * 0.7 + 8;
    const margin = 32;
    let cardCy = mid;
    let potCy = mid + rowH / 2 + 6 * unitStage + potH / 2;
    if (portrait && size === 9) {
        cardCy = mid - 38 * unitStage;
        potCy = cardCy - rowH / 2 - 12 * unitStage - potH / 2;
    } else if (portrait && size === 6) {
        const groupTop = mid - 12 * unitStage - (potH + margin + rowH) / 2;
        potCy = groupTop + potH / 2;
        cardCy = groupTop + potH + margin + rowH / 2;
    } else if (portrait && size === 4) {
        const top = dims.tableHeight * 0.2;
        potCy = top + potH / 2;
        cardCy = top + potH + margin + rowH / 2;
    } else if (portrait) {
        const groupTop = mid - (potH + margin + rowH) / 2;
        potCy = groupTop + potH / 2;
        cardCy = groupTop + potH + margin + rowH / 2;
    }
    const logoW = Math.min(dims.tableWidth * 0.44, 440);
    const logoH = logoW * (340 / 640);
    return [
        { x: cx, y: cardCy, hw: rowW / 2 + 2, hy: rowH / 2 + 2 },
        { x: cx, y: potCy, hw: potW / 2, hy: potH / 2 },
        { x: cx, y: mid, hw: logoW / 2, hy: logoH / 2, soft: true }
    ];
}

/**
 * Mobile bet chips sit just inside the rail, in front of the seat. The dealer
 * button sits beside that seat, on the felt. Both stay off seats, community
 * cards and the pot. Desktop keeps the hand-tuned offsets in stageGeometry.
 */
export function placeMobileRailMarkers(
    positions: PositionArrays,
    zoom: number,
    centerYShift = 0,
    screenUnit = 1,
    tableSize: TableSize = 9
): PositionArrays {
    const dims = getStageDims();
    const cx = dims.tableWidth / 2;
    const cy = dims.tableHeight / 2 + centerYShift;
    const z = Math.max(zoom, 0.01);
    const unitStage = screenUnit / z;
    // Seat box is 96×71 mobile units. Chip width covers the pill plus a "$0.18"
    // label; short landscape uses the compact label from Chip.tsx. The dealer
    // button is the 48px element centred on its point.
    const seatHX = 48 * unitStage;
    const seatHY = 35.5 * unitStage;
    // Chip.tsx uses the large pill only when the viewport is phone-sized. A
    // 1024×650 landscape window fails that test and renders the smaller label.
    const shortLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    const bigChips = typeof window !== "undefined" && (window.innerWidth <= 768 || window.innerHeight <= 500) && !shortLandscape;
    const chipHX = bigChips ? 86 : shortLandscape ? 72 : 54;
    const chipHY = bigChips ? 19 : 17;
    const dealerHalf = 24;
    // Preferred air when the rail has room. The minimum matches the overlap
    // check used on the rendered boxes (half a pixel of slack).
    const preferGap = 8 / z;
    const minGap = 0.5 / z;
    const board = mobileBoardKeepOut(tableSize, unitStage, dims.tableHeight > dims.tableWidth);
    const seatBoxes: KeepOut[] = positions.players.map(seat => ({
        x: parseFloat(seat.left),
        y: parseFloat(seat.top),
        hw: seatHX,
        hy: seatHY
    }));
    const feltTop = Math.min(...seatBoxes.map(seat => seat.y));
    const feltBottom = Math.max(...seatBoxes.map(seat => seat.y));

    const clearOf = (ux: number, uy: number, halfX: number, halfY: number) => {
        const needX = (seatHX + halfX + preferGap) / Math.max(Math.abs(ux), 0.08);
        const needY = (seatHY + halfY + preferGap) / Math.max(Math.abs(uy), 0.08);
        return Math.min(needX, needY);
    };

    const choose = (
        sx: number,
        sy: number,
        halfX: number,
        halfY: number,
        targetAng: number,
        extra: KeepOut[]
    ): { x: number; y: number } => {
        const len = Math.hypot(cx - sx, cy - sy) || 1;
        const ux = (cx - sx) / len;
        const uy = (cy - sy) / len;
        const hard = [...seatBoxes, ...board.filter(item => !item.soft), ...extra];
        const soft = board.filter(item => item.soft);
        let best: { x: number; y: number; score: number } | null = null;
        const consider = (x: number, y: number, score: number) => {
            const progress = (x - sx) * ux + (y - sy) * uy;
            // In front of this seat, and inside the seat ring so it stays on the felt.
            if (progress < 4 / z) return;
            if (y < feltTop || y > feltBottom || x < 0 || x > dims.tableWidth) return;
            const box = { x, y, hw: halfX, hy: halfY };
            if (hard.some(item => boxesOverlap(box, item, minGap))) return;
            const logoHit = soft.some(item => boxesOverlap(box, item, minGap)) ? 1 : 0;
            const total = score + logoHit * (14 / z);
            if (!best || total < best.score) best = { x, y, score: total };
        };
        // Stay on the rail, in front of the seat. A small angle puts the dealer
        // beside the chip; chips themselves prefer the straight inward point.
        const angles = targetAng === 0 ? [0, 0.22, -0.22, 0.45, -0.45] : [targetAng, -targetAng, 0.4, -0.4, 0];
        for (const ang of angles) {
            const dirX = ux * Math.cos(ang) - uy * Math.sin(ang);
            const dirY = uy * Math.cos(ang) + ux * Math.sin(ang);
            const minD = clearOf(dirX, dirY, halfX, halfY);
            for (let step = 0; step <= 2; step++) {
                const dist = minD + step * (8 / z);
                if (dist > len * 0.72) continue;
                const x = sx + dirX * dist;
                const y = sy + dirY * dist;
                const progress = (x - sx) * ux + (y - sy) * uy;
                if (progress < minD * 0.5) continue;
                consider(x, y, dist + Math.abs(Math.abs(ang) - targetAng) * (48 / z));
            }
        }
        // Short felts put the rail point on the pot or the cards. Slide along
        // the rail, both ways, and stop at the first step that fits. The slide
        // stays in front of this seat instead of crossing the table.
        // A chip that only clips the watermark can step along the rail a short
        // way. Anything further would leave the seat it belongs to.
        // `best` is written inside `consider`, which control-flow analysis
        // cannot see, so copy it through a cast before reading its fields.
        const placed = best as { x: number; y: number; score: number } | null;
        if (placed && soft.some(item => boxesOverlap({ x: placed.x, y: placed.y, hw: halfX, hy: halfY }, item, minGap))) {
            const tx = -uy;
            const ty = ux;
            let nudged: { x: number; y: number; score: number } | null = null;
            for (let step = 1; step <= 6 && !nudged; step++) {
                const slide = step * (4 / z);
                for (const sign of [1, -1]) {
                    const x = placed.x + tx * sign * slide;
                    const y = placed.y + ty * sign * slide;
                    const box = { x, y, hw: halfX, hy: halfY };
                    const progress = (x - sx) * ux + (y - sy) * uy;
                    if (progress < 4 / z || y < feltTop || y > feltBottom || x < 0 || x > dims.tableWidth) continue;
                    if (hard.some(item => boxesOverlap(box, item, minGap))) continue;
                    if (soft.some(item => boxesOverlap(box, item, minGap))) continue;
                    nudged = { x, y, score: placed.score };
                    break;
                }
            }
            if (nudged) best = nudged;
        }
        if (!best) {
            const anchorD = Math.min(clearOf(ux, uy, halfX, halfY), len * 0.72);
            const ax = sx + ux * anchorD;
            const ay = sy + uy * anchorD;
            const tx = -uy;
            const ty = ux;
            for (let step = 1; step <= 36 && !best; step++) {
                const slide = step * (4 / z);
                // Positive lift steps further onto the felt. Negative lift tucks
                // into the gap beside the seat when the pot covers the rail point.
                for (const lift of [0, 8 / z, -16 / z, -32 / z]) {
                    consider(ax + tx * slide + ux * lift, ay + ty * slide + uy * lift, anchorD + slide + lift);
                    consider(ax - tx * slide + ux * lift, ay - ty * slide + uy * lift, anchorD + slide + lift);
                }
            }
        }
        if (best) return best;
        const fallback = Math.min(clearOf(ux, uy, halfX, halfY), len * 0.72);
        return { x: sx + ux * fallback, y: sy + uy * fallback };
    };

    // Seats nearer the side rails pick a pocket first. The centred hero then
    // takes whichever side is left, instead of claiming a corner seat's chip.
    const order = seatBoxes.map((seat, index) => ({ index, len: Math.hypot(cx - seat.x, cy - seat.y), side: Math.abs(seat.x - cx) }))
        .sort((a, b) => (b.side - a.side) || (b.len - a.len));
    const chipCenters: Array<{ x: number; y: number } | undefined> = [];
    const placedChips: KeepOut[] = [];
    for (const item of order) {
        const seat = seatBoxes[item.index];
        const point = choose(seat.x, seat.y, chipHX, chipHY, 0, placedChips);
        chipCenters[item.index] = point;
        placedChips.push({ x: point.x, y: point.y, hw: chipHX, hy: chipHY });
    }
    const chips = seatBoxes.map((_, index) => {
        const point = chipCenters[index] ?? seatBoxes[index];
        return { left: `${Math.round(point.x)}px`, top: `${Math.round(point.y)}px`, bottom: "0px" };
    });
    const dealers = seatBoxes.map(seat => {
        const point = choose(seat.x, seat.y, dealerHalf, dealerHalf, 0.78, placedChips);
        return { left: `${Math.round(point.x)}px`, top: `${Math.round(point.y)}px` };
    });
    return { ...positions, chips, dealers };
}
