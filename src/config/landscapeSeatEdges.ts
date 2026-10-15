import { mobileCardUnit } from "./mobileCardSizing";
import { getContentBounds, getStageDims, type PositionArrays, type TableSize } from "./stageGeometry";

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
        chips: positions.chips.map((p, i) => ({ ...p, bottom: `${parseFloat(p.bottom) - offsets[i]}px` })),
        dealers,
        turnAnimations: positions.turnAnimations.map(move),
        winAnimations: positions.winAnimations.map(move),
        holeCards: positions.holeCards.map((p, i) => ({ first: move(p.first, i), second: move(p.second, i) }))
    };
}
