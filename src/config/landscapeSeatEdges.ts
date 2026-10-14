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
