import { mobileCardUnit } from "./mobileCardSizing";
import { getContentBounds, getStageDims, type ChipPosition, type PositionArrays, type TableSize } from "./stageGeometry";

type Box = { x0: number; y0: number; x1: number; y1: number };

function overlaps(a: Box, b: Box): boolean {
    return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0
        && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
}

function inFelt(x: number, y: number, tableW: number, tableH: number): boolean {
    if (x < 1 || y < 1 || x > tableW - 1 || y > tableH - 1) return false;
    const radius = Math.min(250, tableH / 2);
    if (x >= radius && x <= tableW - radius) return true;
    const cx = x < radius ? radius : tableW - radius;
    return (x - cx) * (x - cx) + (y - tableH / 2) * (y - tableH / 2) <= (radius - 1) * (radius - 1);
}

/**
 * Action banners paint above the chip pile, so a pile inside one is hidden.
 * The pile is wider than the old keep-out (the label plus the chip stack).
 * Slide only a pile that meets a banner, staying on the felt. A spot that also
 * misses hole cards, badges, and the board wins over one that only misses banners.
 */
function nudgeChipsOffActionBoxes(
    chips: ChipPosition[],
    players: { left: string; top: string }[],
    tableW: number,
    tableH: number,
    unitStage: number
): ChipPosition[] {
    const seatHY = 35.5 * unitStage;
    const cardH = 51 * unitStage;
    const bannerHw = 44 * unitStage + 2;
    const chipW = 156;
    const pillH = 36;
    const stack = 8;
    const seats = players.map(seat => ({ x: parseFloat(seat.left), y: parseFloat(seat.top) }));
    const box = (cx: number, cy: number, hw: number, hy: number, gap: number): Box => ({
        x0: cx - hw - gap,
        y0: cy - hy - gap,
        x1: cx + hw + gap,
        y1: cy + hy + gap
    });
    const cards: Box[] = [];
    const badges: Box[] = [];
    const banners: Box[] = [];
    for (const seat of seats) {
        const cardTop = seat.y - seatHY;
        cards.push(box(seat.x, cardTop + cardH / 2, Math.min(37 * unitStage, 48 * unitStage), cardH / 2, 1));
        badges.push(box(seat.x, seat.y + 23 * unitStage, 42 * unitStage, 13 * unitStage, 1));
        banners.push(box(seat.x, seat.y + seatHY - 22 + 27.5, bannerHw, 27.5, 8));
    }
    const board = box(tableW / 2, tableH / 2, 190, 64, 4);
    const chipRect = (left: number, bottom: number): Box => {
        const y1 = tableH - bottom + stack;
        const y0 = y1 - pillH - stack * 2;
        return { x0: left, y0, x1: left + chipW, y1 };
    };
    const hitsAny = (rect: Box, list: Box[]) => list.some(item => overlaps(rect, item));
    const onFelt = (rect: Box) =>
        inFelt(rect.x0, rect.y0, tableW, tableH)
        && inFelt(rect.x1, rect.y0, tableW, tableH)
        && inFelt(rect.x0, rect.y1, tableW, tableH)
        && inFelt(rect.x1, rect.y1, tableW, tableH);
    const placed: Box[] = [];
    return chips.map((chip, index) => {
        const left0 = parseFloat(chip.left);
        const bottom0 = parseFloat(chip.bottom);
        const start = chipRect(left0, bottom0);
        if (!hitsAny(start, banners)) {
            placed.push(start);
            return chip;
        }
        const seat = seats[index];
        const best: { current: { left: number; bottom: number; rank: number; cost: number } | null } = { current: null };
        const consider = (left: number, bottom: number, strict: boolean) => {
            const rect = chipRect(left, bottom);
            if (!onFelt(rect) || hitsAny(rect, banners) || hitsAny(rect, placed)) return;
            if (strict && (hitsAny(rect, cards) || hitsAny(rect, badges) || overlaps(rect, board))) return;
            const cx = (rect.x0 + rect.x1) / 2;
            const cy = (rect.y0 + rect.y1) / 2;
            const own = Math.hypot(cx - seat.x, cy - seat.y);
            const nearer = seats.every((other, otherIndex) =>
                otherIndex === index || own < Math.hypot(cx - other.x, cy - other.y));
            const rank = (strict ? 0 : 2) + (nearer ? 0 : 1);
            const cost = Math.abs(left - left0) + Math.abs(bottom - bottom0);
            const chosen = best.current;
            if (!chosen || rank < chosen.rank || (rank === chosen.rank && cost < chosen.cost)) {
                best.current = { left, bottom, rank, cost };
            }
        };
        for (const strict of [true, false]) {
            for (let step = 0; step <= 360; step += 4) {
                consider(left0 + step, bottom0, strict);
                consider(left0 - step, bottom0, strict);
                consider(left0, bottom0 + step, strict);
                consider(left0, bottom0 - step, strict);
                consider(left0 + step, bottom0 + step, strict);
                consider(left0 + step, bottom0 - step, strict);
                consider(left0 - step, bottom0 + step, strict);
                consider(left0 - step, bottom0 - step, strict);
            }
            if (best.current && best.current.rank < 2) break;
        }
        if (!best.current) {
            placed.push(start);
            return chip;
        }
        const chosen = best.current;
        placed.push(chipRect(chosen.left, chosen.bottom));
        return { ...chip, left: `${Math.round(chosen.left)}px`, bottom: `${Math.round(chosen.bottom)}px` };
    });
}

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
    const players = positions.players.map(move);
    // The seating layer paints above the dealer button. A button that lands on
    // the hole cards or the action banner (55px, tucked 22px under the badge)
    // never shows. Step just those buttons sideways until they sit beside the seat.
    const unitStage = parseFloat(mobileCardUnit(false, zoom, width, height));
    const seatHY = 35.5 * unitStage;
    const blockers = players.map(seat => {
        const sx = parseFloat(seat.left);
        const sy = parseFloat(seat.top);
        const cardH = 51 * unitStage;
        const cardTop = sy - seatHY;
        return [
            { x: sx, y: cardTop + cardH / 2, hw: Math.min(37 * unitStage, 48 * unitStage), hy: cardH / 2 },
            { x: sx, y: sy + seatHY - 22 + 27.5, hw: 44 * unitStage + 2, hy: 27.5 }
        ];
    });
    const covered = (x: number, y: number) => blockers.some(pair => pair.some(box =>
        Math.abs(x - box.x) < 24 + box.hw && Math.abs(y - box.y) < 24 + box.hy
    ));
    const chips = nudgeChipsOffActionBoxes(
        positions.chips.map((p, i) => ({ ...p, bottom: `${parseFloat(p.bottom) - offsets[i]}px` })),
        players,
        dims.tableWidth,
        dims.tableHeight,
        unitStage
    );
    const dealers = positions.dealers.map((dealer, index) => {
        const shifted = move(dealer, index);
        const sx = parseFloat(players[index].left);
        const sy = parseFloat(players[index].top);
        const x0 = parseFloat(shifted.left);
        const y0 = parseFloat(shifted.top);
        if (!covered(x0, y0)) return shifted;
        const own = (x: number, y: number) => {
            const dist = Math.hypot(x - sx, y - sy);
            return players.every((other, otherIndex) => {
                if (otherIndex === index) return true;
                return dist + 4 < Math.hypot(x - parseFloat(other.left), y - parseFloat(other.top));
            });
        };
        let best: number | null = null;
        for (const sign of [1, -1]) {
            for (let step = 4; step <= 200; step += 4) {
                const x = x0 + sign * step;
                if (!own(x, y0) || covered(x, y0)) continue;
                if (best === null || Math.abs(x - sx) < Math.abs(best - sx)) best = x;
                break;
            }
        }
        return best === null ? shifted : { ...shifted, left: `${Math.round(best)}px` };
    });
    return {
        ...positions,
        players,
        vacantPlayers: positions.vacantPlayers.map(move),
        chips,
        dealers,
        turnAnimations: positions.turnAnimations.map(move),
        winAnimations: positions.winAnimations.map(move),
        holeCards: positions.holeCards.map((p, i) => ({ first: move(p.first, i), second: move(p.second, i) }))
    };
}
