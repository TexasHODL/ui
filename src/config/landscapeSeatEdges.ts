import { landscapeCommunityCardSize, landscapeHoleCardSize } from "./mobileCardSizing";
import { getStageDims, type PositionArrays, type TableSize } from "./stageGeometry";

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
function mobileBoardKeepOut(size: TableSize, unitStage: number, portrait: boolean, lift: number): KeepOut[] {
    const dims = getStageDims();
    const cx = dims.tableWidth / 2;
    const mid = dims.tableHeight / 2;
    const community = portrait
        ? { width: 39, height: 39 * 805 / 550 }
        : landscapeCommunityCardSize();
    const rowW = (5 * community.width + 4 * 3) * unitStage;
    const rowH = community.height * unitStage;
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
        // Same 4-unit gap as the portrait Total Pot rule in mobileReadability.css.
        potCy = cardCy - rowH / 2 - 4 * unitStage - potH / 2;
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
    // Short landscape CSS lifts the board (`mobileReadability.css`, 12 units)
    // so the pot is not sitting on the bottom hole cards. The logo stays put.
    cardCy -= lift;
    potCy -= lift;
    const logoW = Math.min(dims.tableWidth * 0.44, 440);
    const logoH = logoW * (340 / 640);
    return [
        { x: cx, y: cardCy, hw: rowW / 2 + 2, hy: rowH / 2 + 2 },
        { x: cx, y: potCy, hw: potW / 2, hy: potH / 2 },
        { x: cx, y: mid, hw: logoW / 2, hy: logoH / 2, soft: true }
    ];
}


/**
 * Mobile bet chips sit just inside the rail, in front of their own seat, and
 * stay off seats, hole cards, community cards and the pot. The dealer button
 * is drawn on the seat badge, not placed here. Desktop keeps the hand-tuned
 * chip offsets in stageGeometry.
 *
 * Card rectangles (hole cards and the community row) in table-div pixels, for
 * the same keep-out the placer uses. Tests assert markers miss these boxes.
 */
export function mobileCardObstacles(
    positions: PositionArrays,
    zoom: number,
    screenUnit: number,
    tableSize: TableSize
): Array<{ x: number; y: number; hw: number; hy: number }> {
    const dims = getStageDims();
    const z = Math.max(zoom, 0.01);
    const unitStage = screenUnit / z;
    const portrait = dims.tableHeight > dims.tableWidth;
    const seatHX = 48 * unitStage;
    const seatHY = 35.5 * unitStage;
    const holes = positions.players.map(seat => holeCardBox(parseFloat(seat.left), parseFloat(seat.top), seatHX, seatHY, unitStage, portrait));
    const board = mobileBoardKeepOut(tableSize, unitStage, portrait, 0).filter(item => !item.soft);
    // The first board entry is the community row; the second is the pot.
    return [...holes, board[0]];
}

/**
 * True when a table-div point lies inside the painted felt, clear of the rail.
 * `pad` is the air inside the outer edge,
 * in table pixels, so a bet sits on the felt rather than on the stroke.
 */
export function mobileFeltContains(x: number, y: number, scaleY: number, shiftY: number, pad = 4): boolean {
    const dims = getStageDims();
    const w = dims.tableWidth;
    const h = dims.tableHeight;
    const s = Math.max(scaleY, 0.01);
    const centerY = h / 2 + shiftY;
    const localX = x;
    const localY = h / 2 + (y - centerY) / s;
    const radius = Math.min(250, Math.min(w, h) / 2);
    const padX = pad;
    const padY = pad / s;
    const landscape = w >= h;
    if (landscape) {
        const rx = radius - padX;
        const ry = radius - padY;
        if (rx <= 1 || ry <= 1) return false;
        const cy = h / 2;
        const cxL = radius;
        const cxR = w - radius;
        if (localX < cxL) return ((localX - cxL) / rx) ** 2 + ((localY - cy) / ry) ** 2 <= 1;
        if (localX > cxR) return ((localX - cxR) / rx) ** 2 + ((localY - cy) / ry) ** 2 <= 1;
        return localY >= padY && localY <= h - padY && localX >= padX && localX <= w - padX;
    }
    const rx = radius - padX;
    const ry = radius - padY;
    if (rx <= 1 || ry <= 1) return false;
    const cx = w / 2;
    const cyT = radius;
    const cyB = h - radius;
    if (localY < cyT) return ((localX - cx) / rx) ** 2 + ((localY - cyT) / ry) ** 2 <= 1;
    if (localY > cyB) return ((localX - cx) / rx) ** 2 + ((localY - cyB) / ry) ** 2 <= 1;
    return localX >= padX && localX <= w - padX && localY >= padY && localY <= h - padY;
}

function holeCardBox(sx: number, sy: number, seatHX: number, _seatHY: number, unitStage: number, portrait: boolean): KeepOut {
    // The fan is the top of the 71-unit seat. An 8° rotation sticks a few
    // units past the seat's top edge (toward the felt on a bottom seat).
    // Landscape cards are 2px taller, so the fan they occupy is wider too.
    const hole = portrait ? { width: 39, height: 51 } : landscapeHoleCardSize();
    const cardH = hole.height * unitStage;
    const cardW = (hole.width * 2 - 8 + 4) * unitStage;
    const overflow = 1 * unitStage;
    const top = sy - 35.5 * unitStage - overflow;
    const height = cardH + overflow;
    return { x: sx, y: top + height / 2, hw: Math.min(cardW / 2 + 2 * unitStage, seatHX), hy: height / 2 };
}

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
    const feltScaleY = 1;
    const boxOnFelt = (x: number, y: number, hw: number, hy: number) =>
        [[-hw, -hy], [hw, -hy], [-hw, hy], [hw, hy]].every(([dx, dy]) => mobileFeltContains(x + dx, y + dy, feltScaleY, centerYShift));
    const unitStage = screenUnit / z;
    // Seat box is 96×71 mobile units. Chip width covers the pill plus a "$0.18"
    // label.
    const seatHX = 48 * unitStage;
    const seatHY = 35.5 * unitStage;
    // Half-width of the pile used while placing it. Short landscape keeps the
    // 72px box. The amount text itself is pinned to one on-screen size in
    // mobileReadability.css and does not move this point.
    const shortLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    const bigChips = typeof window !== "undefined" && (window.innerWidth <= 768 || window.innerHeight <= 500) && !shortLandscape;
    const chipHX = bigChips ? 86 : shortLandscape ? 72 : 54;
    const chipHY = 26;
    // Preferred air when the rail has room. The minimum matches the overlap
    // check used on the rendered boxes (half a pixel of slack).
    // Tight air: a short felt has only a few pixels between the pot and the
    // hole cards, so the bet sits against its seat rather than on the pot.
    const preferGap = 5 / z;
    const minGap = 0.5 / z;
    const boardLift = 0;
    const board = mobileBoardKeepOut(tableSize, unitStage, dims.tableHeight > dims.tableWidth, boardLift);
    const seatBoxes: KeepOut[] = positions.players.map(seat => ({
        x: parseFloat(seat.left),
        y: parseFloat(seat.top),
        hw: seatHX,
        hy: seatHY
    }));
    const holeCards = seatBoxes.map(seat => holeCardBox(seat.x, seat.y, seatHX, seatHY, unitStage, dims.tableHeight > dims.tableWidth));
    const feltTop = Math.min(...seatBoxes.map(seat => seat.y));
    const feltBottom = Math.max(...seatBoxes.map(seat => seat.y));
    const neighborDist = seatBoxes.map((seat, index) => {
        let nearest = Infinity;
        seatBoxes.forEach((other, otherIndex) => {
            if (otherIndex !== index) nearest = Math.min(nearest, Math.hypot(seat.x - other.x, seat.y - other.y));
        });
        return nearest;
    });

    const choose = (
        sx: number,
        sy: number,
        seatIndex: number,
        halfX: number,
        halfY: number,
        angles: number[],
        preferred: number,
        extra: KeepOut[],
        inset = 0
    ): { x: number; y: number } => {
        const len = Math.hypot(cx - sx, cy - sy) || 1;
        const ux = (cx - sx) / len;
        const uy = (cy - sy) / len;
        const clearOf = (dirX: number, dirY: number, halfX: number, halfY: number) => {
            const needX = (coreHX + halfX + preferGap) / Math.max(Math.abs(dirX), 0.08);
            const needY = (coreHY + halfY + preferGap) / Math.max(Math.abs(dirY), 0.08);
            return Math.min(needX, needY);
        };
        const coreHX = Math.max(8, seatHX - inset);
        const coreHY = Math.max(8, seatHY - inset);
        const coreSeats = seatBoxes.map(seat => ({ ...seat, hw: coreHX, hy: coreHY }));
        const hard = [...coreSeats, ...holeCards, ...board.filter(item => !item.soft), ...extra];
        const soft = board.filter(item => item.soft);
        // Stay in this seat's cell: closer to it than to any neighbour, and
        // not out near the boundary where the bet could be read as either.
        const owned = (x: number, y: number) => {
            const own = Math.hypot(x - sx, y - sy);
            const margin = 8 / z;
            // Closer to this seat than to any neighbour, by a visible margin,
            // so the bet cannot be read as belonging to the next player.
            return seatBoxes.every((other, index) => index === seatIndex || own + margin < Math.hypot(x - other.x, y - other.y));
        };
        let best: { x: number; y: number; score: number } | null = null;
        const consider = (x: number, y: number, score: number) => {
            const progress = (x - sx) * ux + (y - sy) * uy;
            // Chips stay inward of the seat.
            const minProgress = preferred === 0 ? 4 / z : -36;
            if (progress < minProgress) return;
            const yPad = preferred === 0 ? 2 / z : 48;
            if (y < feltTop - yPad || y > feltBottom + yPad || x < -40 || x > dims.tableWidth + 40) return;
            if (!owned(x, y)) return;
            const box = { x, y, hw: halfX, hy: halfY };
            if (hard.some(item => boxesOverlap(box, item, minGap))) return;
            const logoHit = soft.some(item => boxesOverlap(box, item, minGap)) ? 1 : 0;
            const total = score + logoHit * (14 / z);
            if (!best || total < best.score) best = { x, y, score: total };
        };
        const cap = Math.max(len * 0.8, neighborDist[seatIndex] * (preferred === 0 ? 0.45 : 0.48));
        const sample = (ang: number) => {
            const dirX = ux * Math.cos(ang) - uy * Math.sin(ang);
            const dirY = uy * Math.cos(ang) + ux * Math.sin(ang);
            const minD = clearOf(dirX, dirY, halfX, halfY);
            for (let step = 0; step <= 8; step++) {
                const dist = minD + step * (4 / z);
                if (dist > cap) break;
                consider(sx + dirX * dist, sy + dirY * dist, dist + Math.abs(Math.abs(ang) - preferred) * (36 / z));
            }
        };
        for (const ang of angles) sample(ang);
        // `best` is written inside `consider`, which control-flow analysis
        // cannot see, so copy it through a cast before reading its fields.
        const placed = best as { x: number; y: number; score: number } | null;
        if (placed && soft.some(item => boxesOverlap({ x: placed.x, y: placed.y, hw: halfX, hy: halfY }, item, minGap))) {
            const tx = -uy;
            const ty = ux;
            let nudged: { x: number; y: number; score: number } | null = null;
            for (let step = 1; step <= 4 && !nudged; step++) {
                const slide = step * (4 / z);
                for (const sign of [1, -1]) {
                    const x = placed.x + tx * sign * slide;
                    const y = placed.y + ty * sign * slide;
                    if (!owned(x, y)) continue;
                    const box = { x, y, hw: halfX, hy: halfY };
                    const progress = (x - sx) * ux + (y - sy) * uy;
                    if (progress < 4 / z || y < feltTop - 2 / z || y > feltBottom + 2 / z || x < 0 || x > dims.tableWidth) continue;
                    if (hard.some(item => boxesOverlap(box, item, minGap))) continue;
                    if (soft.some(item => boxesOverlap(box, item, minGap))) continue;
                    nudged = { x, y, score: placed.score };
                    break;
                }
            }
            if (nudged) best = nudged;
        }
        // A wide angle reaches the shoulder beside the seat when the straight
        // inward point belongs to the neighbour or sits under the cards.
        if (!best) {
            for (let ang = 0; ang <= 1.45; ang += 0.15) {
                sample(ang);
                if (ang > 0) sample(-ang);
            }
        }
        if (best) return best;
        const fallback = Math.min(clearOf(ux, uy, halfX, halfY), cap);
        return { x: sx + ux * fallback, y: sy + uy * fallback };
    };

    // Chips prefer the straight inward point, just off that ray when the
    // neighbour or the cards already own it.
    const chipAngles = [0, 0.18, -0.18, 0.36, -0.36];
    const order = seatBoxes.map((seat, index) => ({ index, len: Math.hypot(cx - seat.x, cy - seat.y), side: Math.abs(seat.x - cx) }))
        .sort((a, b) => (b.side - a.side) || (b.len - a.len));
    const chipCenters: Array<{ x: number; y: number } | undefined> = [];
    const placedChips: KeepOut[] = [];
    for (const item of order) {
        const seat = seatBoxes[item.index];
        const point = choose(seat.x, seat.y, item.index, chipHX, chipHY, chipAngles, 0, placedChips);
        // On a short felt the centre seats have a band only as tall as the
        // pill, so the conservative search falls back onto the pot or the
        // cards. Nudge just those bets back toward their seat. Side seats
        // already have a clear spot and must stay put.
        if (shortLandscape) {
            const vertical = seat.y - cy;
            const visualHY = (vertical > 0 ? 10 : 14) / z;
            const onBoard = board.some(item => !item.soft && boxesOverlap(
                { x: point.x, y: point.y, hw: chipHX, hy: visualHY }, item, 0
            ));
            if (onBoard && vertical > 40) point.y += 12;
            else if (onBoard && vertical < -40) point.y -= 8;
        }
        chipCenters[item.index] = point;
        // Pad the obstacle past the pill so the chip stack, which hangs off the
        // label, stays clear of the next player's bet.
        placedChips.push({ x: point.x, y: point.y, hw: chipHX + 6, hy: chipHY + 6 });
    }
    // The straight-inward spot can leave a wide pile outside the curved rail.
    // Nudge only those piles, after every bet has a spot, so one correction
    // cannot push the next player's bet onto the pot.
    const feltHX = chipHX;
    const feltHY = 18;
    const holeGap = shortLandscape ? 12 : 18;
    // The wide "$0.16" pile on a 1024 landscape label is wider than the search
    // box. Seat clearance uses that wider half so the rendered pile clears the
    // seat widget, not only the pill the search modelled. Short landscape and
    // portrait already size the search box to the rendered pile.
    const pileHX = !shortLandscape && !bigChips ? 66 : chipHX;
    const pileHY = 20;
    // mobileReadability.css shrinks the painted mark to 24% (short landscape)
    // and 26% (portrait) of the table. The search still treats the full 44%
    // watermark as a soft penalty; this box is the mark that is actually drawn.
    const paintedScale = dims.tableHeight > dims.tableWidth ? 0.26 / 0.44 : 1;
    const fullLogo = board.find(item => item.soft);
    const paintedLogo = fullLogo
        ? { ...fullLogo, hw: fullLogo.hw * paintedScale, hy: fullLogo.hy * paintedScale }
        : undefined;
    const railBlockers = board.filter(blocker => !blocker.soft);
    const chipIndexOf = (seatIndex: number) => order.findIndex(item => item.index === seatIndex);
    const remember = (seatIndex: number, x: number, y: number) => {
        const chipIndex = chipIndexOf(seatIndex);
        if (chipIndex >= 0) placedChips[chipIndex] = { x, y, hw: chipHX + 6, hy: chipHY + 6 };
    };
    // Pull a pile that sits outside the curved rail back onto the felt. This
    // pass does not know about seats: the seat widget hangs onto the felt, and
    // requiring both at once can leave the pile outside the rail.
    seatBoxes.forEach((seat, index) => {
        const point = chipCenters[index];
        if (!point || boxOnFelt(point.x, point.y, feltHX, feltHY)) return;
        const span = Math.hypot(cx - seat.x, cy - seat.y) || 1;
        const ux = (cx - seat.x) / span;
        const uy = (cy - seat.y) / span;
        let best: { x: number; y: number; dist: number } | null = null;
        for (let ang = -1.5; ang <= 1.5; ang += 0.15) {
            const dirX = ux * Math.cos(ang) - uy * Math.sin(ang);
            const dirY = uy * Math.cos(ang) + ux * Math.sin(ang);
            for (let dist = 24; dist <= 260; dist += 4) {
                const x = seat.x + dirX * dist;
                const y = seat.y + dirY * dist;
                if (!boxOnFelt(x, y, feltHX, feltHY)) continue;
                const own = Math.hypot(x - seat.x, y - seat.y);
                const margin = 8 / z;
                const owned = seatBoxes.every((other, otherIndex) => otherIndex === index || own + margin < Math.hypot(x - other.x, y - other.y));
                if (!owned) continue;
                const box = { x, y, hw: feltHX, hy: feltHY };
                if (railBlockers.some(blocker => boxesOverlap(box, blocker, 4))) continue;
                if (holeCards.some((card, cardIndex) => cardIndex !== index && boxesOverlap(box, card, holeGap))) continue;
                if (holeCards[index] && boxesOverlap(box, holeCards[index], holeGap)) continue;
                if (!best || dist < best.dist) best = { x, y, dist };
                break;
            }
        }
        if (best) {
            point.x = best.x;
            point.y = best.y;
            remember(index, best.x, best.y);
        }
    });
    // A pile that is already on the felt can still cover its seat or the
    // painted mark. Step it to the nearest spot that is still on the felt, in
    // front of this seat, and clear of both. If no such spot exists the pile
    // stays where the felt pass put it.
    seatBoxes.forEach((seat, index) => {
        const point = chipCenters[index];
        if (!point) return;
        const pileAt = (x: number, y: number) => ({ x, y, hw: pileHX, hy: pileHY });
        const overlapsSeat = seatBoxes.some(other => boxesOverlap(pileAt(point.x, point.y), other, 2));
        const overlapsLogo = !!paintedLogo && boxesOverlap(pileAt(point.x, point.y), paintedLogo, 2);
        if (!overlapsSeat && !overlapsLogo) return;
        const span = Math.hypot(cx - seat.x, cy - seat.y) || 1;
        const ux = (cx - seat.x) / span;
        const uy = (cy - seat.y) / span;
        // The smallest step off the current pile. A wide 1024 pile has to be
        // tested at its real width, or the step that clears the seat lands
        // with the chips hanging off the rail.
        let best: { x: number; y: number; moved: number } | null = null;
        for (let ang = -1.55; ang <= 1.55; ang += 0.1) {
            const dirX = ux * Math.cos(ang) - uy * Math.sin(ang);
            const dirY = uy * Math.cos(ang) + ux * Math.sin(ang);
            for (let dist = 20; dist <= 280; dist += 4) {
                const x = seat.x + dirX * dist;
                const y = seat.y + dirY * dist;
                if (!boxOnFelt(x, y, pileHX, feltHY)) continue;
                const own = Math.hypot(x - seat.x, y - seat.y);
                const margin = 8 / z;
                const owned = seatBoxes.every((other, otherIndex) => otherIndex === index || own + margin < Math.hypot(x - other.x, y - other.y));
                if (!owned) continue;
                const box = { x, y, hw: feltHX, hy: feltHY };
                if (railBlockers.some(blocker => boxesOverlap(box, blocker, 4))) continue;
                if (holeCards.some((card, cardIndex) => boxesOverlap(box, card, holeGap))) continue;
                if (seatBoxes.some(other => boxesOverlap(pileAt(x, y), other, 4))) continue;
                if (paintedLogo && boxesOverlap(pileAt(x, y), paintedLogo, 4)) continue;
                const moved = Math.hypot(x - point.x, y - point.y);
                if (!best || moved < best.moved) best = { x, y, moved };
            }
        }
        if (best) {
            point.x = best.x;
            point.y = best.y;
            remember(index, best.x, best.y);
        }
    });
    // The inward search pulls several 9-seat bets off their own hole cards.
    // Slide each one sideways, at the height it already has, toward that
    // seat. Seats 2, 9, 5 and 6 reach the card centre. Seats 3 and 8 take
    // a short step toward the player and stop clear of the card fan. A step
    // that would leave the felt, cover a card, or cover a seat is not taken.
    if (tableSize === 9) {
        const landscape = dims.tableWidth > dims.tableHeight;
        const fitsChip = (x: number, y: number, feltHalf: number, seatHalf: number, seatGap: number) => {
            if (!boxOnFelt(x, y, feltHalf, feltHY)) return false;
            const box = { x, y, hw: feltHX, hy: feltHY };
            if (railBlockers.some(blocker => boxesOverlap(box, blocker, 4))) return false;
            if (holeCards.some(card => boxesOverlap({ x, y, hw: Math.min(chipHX, feltHalf), hy: 16 }, card, 0))) return false;
            if (seatBoxes.some(other => boxesOverlap({ x, y, hw: seatHalf, hy: pileHY }, other, seatGap))) return false;
            return true;
        };
        const slideToSeat = (index: number, centre: boolean) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (!point || !seat) return;
            const y = Math.round(point.y);
            const goal = Math.round(seat.x);
            // The wide label stays on the felt. Side bets use a slightly
            // narrower seat clearance so the pill can step toward the player.
            // The next step after that meets the card fan, so the nudge stops
            // while the bet is still clear of the cards and the badge.
            const feltHalf = pileHX;
            const seatHalf = centre ? pileHX : Math.max(40, chipHX - 8);
            const seatGap = centre ? 4 : 0;
            const fits = (x: number) => fitsChip(x, y, feltHalf, seatHalf, seatGap);
            if (centre && fits(goal)) {
                point.x = goal;
                remember(index, goal, point.y);
                return;
            }
            const dir = Math.sign(goal - point.x);
            if (dir === 0) return;
            let best = point.x;
            for (let x = Math.round(point.x) + dir; dir > 0 ? x <= goal : x >= goal; x += dir) {
                if (!fits(x)) break;
                best = x;
            }
            point.x = best;
            remember(index, best, y);
        };
        // Portrait cards on these seats hang outside the rail or sit so close
        // to it that a sideways slide leaves the felt. Landscape has the room.
        if (landscape) {
            slideToSeat(1, true);
            slideToSeat(8, true);
            // Top pair centres. Side pair only moves as far as the felt and the
            // cards allow, which keeps the bet beside its player.
            slideToSeat(4, true);
            slideToSeat(5, true);
            slideToSeat(2, false);
            slideToSeat(7, false);
        }
    }
    // A 6-seat side bet gets drawn into the board row on mobile landscape.
    // Lower seats (2 and 6) drop until their centre is level with the inner
    // corner of the hole cards. Upper seats (3 and 5) rise until their centre
    // is level with the stack badge. X moves only the few pixels needed to
    // stay off that landmark. Portrait is left alone.
    if (tableSize === 6 && dims.tableWidth > dims.tableHeight) {
        const fitsSpot = (index: number, x: number, y: number) => {
            if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
            const box = { x, y, hw: feltHX, hy: feltHY };
            if (railBlockers.some(blocker => boxesOverlap(box, blocker, 4))) return false;
            if (holeCards.some(card => boxesOverlap({ x, y, hw: chipHX, hy: 16 }, card, 0))) return false;
            if (seatBoxes.some((other, otherIndex) => otherIndex !== index && boxesOverlap({ x, y, hw: chipHX, hy: pileHY }, other, 0))) return false;
            if (paintedLogo && boxesOverlap({ x, y, hw: pileHX, hy: pileHY }, paintedLogo, 2)) return false;
            return true;
        };
        const slideToward = (index: number, targetY: number, dir: number, landmarkHalf: number) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (!point || !seat) return;
            const y0 = Math.round(point.y);
            const goal = Math.round(targetY);
            if ((dir > 0 && goal <= y0) || (dir < 0 && goal >= y0)) return;
            const x0 = Math.round(point.x);
            const away = Math.sign(x0 - seat.x) || Math.sign(cx - seat.x);
            const minDx = chipHX + landmarkHalf + 1;
            const xClear = Math.abs(x0 - seat.x) < minDx ? Math.round(seat.x + away * minDx) : x0;
            const place = (x: number) => {
                if (fitsSpot(index, x, goal)) {
                    point.x = x;
                    point.y = goal;
                    remember(index, x, goal);
                    return true;
                }
                let best = y0;
                for (let y = y0 + dir; dir > 0 ? y <= goal : y >= goal; y += dir) {
                    if (!fitsSpot(index, x, y)) break;
                    best = y;
                }
                if (best === y0) return false;
                point.x = x;
                point.y = best;
                remember(index, x, best);
                return true;
            };
            if (!place(xClear) && xClear !== x0) place(x0);
        };
        // The stack badge is the 88-unit pill under the fan, centred 23 units
        // below the seat point.
        const badgeHalf = 44 * unitStage;
        seatBoxes.forEach((seat, index) => {
            const card = holeCards[index];
            if (!card) return;
            if (seat.y > cy && (index === 1 || index === 5)) {
                slideToward(index, card.y - card.hy, 1, card.hw);
            }
            if (seat.y < cy && (index === 2 || index === 4)) {
                slideToward(index, seat.y + 23 * unitStage, -1, badgeHalf);
            }
        });
    }
    // The action banner is 55px, tucked 22px under the 88-unit stack badge, and
    // centred on the seat.
    const pillHalf = (22.67 / z) / 2;
    const landscapeTable = dims.tableWidth > dims.tableHeight;
    const actionBanners: KeepOut[] = seatBoxes.map(seat => ({
        x: seat.x,
        y: seat.y + seatHY - 22 + 27.5,
        hw: 44 * unitStage + 2,
        hy: 27.5
    }));
    const hitsBanner = (x: number, y: number, hw: number, hy: number) =>
        actionBanners.some(banner => boxesOverlap({ x, y, hw, hy }, banner, 2));
    // 2-seat mobile landscape: the top player's bet lands under the stack
    // badge, and the action banner covers it. Drop the pile until the pill is
    // below the banner, still centred in front of the seat. The same drop
    // clears any other top bet that is already centred on its seat (6-seat
    // seat 4, 9-seat seats 5 and 6). Portrait is left alone.
    const dropBelowBanner = (index: number) => {
        const point = chipCenters[index];
        const seat = seatBoxes[index];
        if (!point || !seat) return;
        const goal = Math.round(seat.y + seatHY + (55 - 22) + pillHalf + 8 / z);
        const x = Math.round(seat.x);
        const fits = (y: number) => {
            if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
            if (railBlockers.some(blocker => boxesOverlap({ x, y, hw: feltHX, hy: feltHY }, blocker, 4))) return false;
            if (holeCards.some(card => boxesOverlap({ x, y, hw: chipHX, hy: pillHalf }, card, 0))) return false;
            if (board.some(item => !item.soft && boxesOverlap({ x, y, hw: chipHX, hy: pillHalf }, item, 4))) return false;
            if (seatBoxes.some((other, otherIndex) => otherIndex !== index && boxesOverlap({ x, y, hw: chipHX, hy: pillHalf }, other, 2))) return false;
            return true;
        };
        const y0 = Math.round(point.y);
        if (goal <= y0) return;
        let best = y0;
        for (let y = y0 + 1; y <= goal; y++) {
            if (!fits(y)) break;
            best = y;
        }
        if (best !== y0) {
            point.x = x;
            point.y = best;
            remember(index, x, best);
        }
    };
    if (landscapeTable && tableSize === 2) dropBelowBanner(1);
    // 6-seat side bets keep the height set above and step toward their own
    // seat, freeing the middle of the felt. Stop at the rail, the cards, the
    // badge, or the action banner.
    if (landscapeTable && tableSize === 6) {
        const slideOutward = (index: number) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (!point || !seat) return;
            const y = Math.round(point.y);
            const goal = Math.round(seat.x);
            const dir = Math.sign(goal - point.x);
            if (dir === 0) return;
            const badge = { x: seat.x, y: seat.y + 23 * unitStage, hw: 44 * unitStage, hy: 12.5 * unitStage };
            const fits = (x: number) => {
                if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
                if (railBlockers.some(blocker => boxesOverlap({ x, y, hw: feltHX, hy: feltHY }, blocker, 4))) return false;
                if (holeCards.some(card => boxesOverlap({ x, y, hw: pileHX, hy: pillHalf }, card, 2))) return false;
                if (boxesOverlap({ x, y, hw: pileHX, hy: pillHalf }, badge, 2)) return false;
                if (hitsBanner(x, y, pileHX, pillHalf)) return false;
                if (paintedLogo && boxesOverlap({ x, y, hw: pileHX, hy: pileHY }, paintedLogo, 2)) return false;
                const pile = { x, y, hw: chipHX, hy: pillHalf };
                if (chipCenters.some((other, otherIndex) => otherIndex !== index && !!other && boxesOverlap(pile, { x: other.x, y: other.y, hw: chipHX, hy: pillHalf }, 4))) return false;
                return true;
            };
            let best = Math.round(point.x);
            if (!fits(best)) return;
            for (let x = best + dir; dir > 0 ? x <= goal : x >= goal; x += dir) {
                if (!fits(x)) break;
                best = x;
            }
            if (best !== Math.round(point.x)) {
                point.x = best;
                remember(index, best, y);
            }
        };
        [1, 2, 4, 5].forEach(slideOutward);
        dropBelowBanner(3);
    }
    // Any bet still inside an action banner steps off it. A centred top bet
    // drops onto the felt. A side bet steps inward, then down, and stops on
    // the felt clear of the cards.
    if (landscapeTable) {
        seatBoxes.forEach((seat, index) => {
            const point = chipCenters[index];
            if (!point || !hitsBanner(point.x, point.y, pileHX, pillHalf)) return;
            if (seat.y < cy && Math.abs(point.x - seat.x) <= 2) {
                dropBelowBanner(index);
                return;
            }
            const y = Math.round(point.y);
            const inward = Math.sign(cx - seat.x) || 1;
            const clearAt = (x: number, yy: number) => {
                if (!boxOnFelt(x, yy, pileHX, feltHY)) return false;
                if (hitsBanner(x, yy, pileHX, pillHalf)) return false;
                if (holeCards.some(card => boxesOverlap({ x, y: yy, hw: pileHX, hy: pillHalf }, card, 2))) return false;
                if (railBlockers.some(blocker => boxesOverlap({ x, y: yy, hw: feltHX, hy: feltHY }, blocker, 4))) return false;
                if (board.some(item => !item.soft && boxesOverlap({ x, y: yy, hw: pileHX, hy: pillHalf }, item, 4))) return false;
                return true;
            };
            let placed = false;
            for (let step = 1; step <= 160 && !placed; step++) {
                const x = Math.round(point.x) + inward * step;
                if (!clearAt(x, y)) continue;
                point.x = x;
                remember(index, x, y);
                placed = true;
            }
            if (placed) return;
            const yDir = Math.sign(cy - seat.y) || 1;
            for (let step = 1; step <= 160; step++) {
                const yy = y + yDir * step;
                if (!clearAt(Math.round(point.x), yy)) continue;
                point.y = yy;
                remember(index, point.x, yy);
                break;
            }
        });
    }
    // 9-seat mobile landscape. The painted action box is as wide as the 30px
    // label (POST BB and RAISE TO run past the stack badge) and the chip pill
    // is wider than the search box, so a pile the model called clear can still
    // sit under the box. Re-place those piles against the painted sizes.
    // 2-seat, 6-seat, portrait and desktop stay put.
    if (landscapeTable && tableSize === 9) {
        const labelHalf = Math.max(pileHX, 40 / z);
        const bannerHalf = Math.max(44 * unitStage, 146);
        const bannerOf = (seat: KeepOut): KeepOut => ({
            x: seat.x,
            y: seat.y + seatHY - 22 + 27.5,
            hw: bannerHalf,
            hy: 27.5
        });
        const paintedCard = (card: KeepOut): KeepOut => ({ ...card, hw: Math.max(card.hw, seatHX * 0.96) });
        const badgeOf = (seat: KeepOut): KeepOut => ({
            x: seat.x,
            y: seat.y + 23 * unitStage,
            hw: 44 * unitStage,
            hy: 13 * unitStage
        });
        const ownedBy = (x: number, y: number, index: number) => {
            const own = Math.hypot(x - seatBoxes[index].x, y - seatBoxes[index].y);
            const margin = 8 / z;
            return seatBoxes.every((other, otherIndex) => otherIndex === index || own + margin < Math.hypot(x - other.x, y - other.y));
        };
        const chipClear = (index: number, x: number, y: number, bannerGap: number) => {
            const pile = { x, y, hw: labelHalf, hy: pillHalf };
            if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
            if (!ownedBy(x, y, index)) return false;
            if (boxesOverlap(pile, bannerOf(seatBoxes[index]), bannerGap)) return false;
            if (seatBoxes.some((seat, otherIndex) => otherIndex !== index && boxesOverlap(pile, bannerOf(seat), 4))) return false;
            if (boxesOverlap(pile, paintedCard(holeCards[index]), 4)) return false;
            if (boxesOverlap(pile, badgeOf(seatBoxes[index]), 4)) return false;
            if (board.some(item => !item.soft && boxesOverlap(pile, item, 4))) return false;
            return true;
        };
        // A few pixels of felt under the box, capped so a top bet stays in
        // front of its seat instead of travelling to mid-felt.
        const minGap = Math.min(12 / z, 28);
        seatBoxes.forEach((seat, index) => {
            const point = chipCenters[index];
            if (!point) return;
            // Flank and top bets stay on the seat's column. A sideways step
            // taken on the narrow curved rail can stick after the pile moves
            // up; walking toward the centre puts the label back on the felt.
            // Top bets also keep a band of felt under the action box. 12/zoom
            // shrinks that band on a tall tablet until the pile touches the box.
            const gap = index === 4 || index === 5 ? Math.max(minGap, 21) : minGap;
            const centred = index === 1 || index === 8 || index === 4 || index === 5;
            if (centred && Math.abs(point.x - seat.x) > 1) {
                const yDir = Math.sign(cy - point.y) || Math.sign(cy - seat.y) || 1;
                for (let step = 0; step <= 48; step++) {
                    const y = point.y + yDir * step;
                    if (!chipClear(index, seat.x, y, gap)) continue;
                    point.x = Math.round(seat.x);
                    point.y = Math.round(y);
                    remember(index, point.x, point.y);
                    return;
                }
            }
            if (chipClear(index, point.x, point.y, gap)) return;
            const toCentre = Math.hypot(cx - seat.x, cy - seat.y) || 1;
            // Top seats sit above the felt, so the first clear spot under the
            // banner is a little over halfway to the centre. Still in front of
            // the seat, not on the board.
            const maxDist = toCentre * 0.7;
            const vx = cx - seat.x;
            const vy = cy - seat.y;
            const len = Math.hypot(vx, vy) || 1;
            const ux = vx / len;
            const uy = vy / len;
            let best: { x: number; y: number; score: number } | null = null;
            // Straight down (or up) the seat's own column, so a top bet stays
            // centred on its hole cards while it clears the action box.
            const yDir = Math.sign(cy - seat.y) || 1;
            for (let step = 36; step <= maxDist; step += 4) {
                const y = seat.y + yDir * step;
                if (!chipClear(index, seat.x, y, gap)) continue;
                best = { x: seat.x, y, score: 100_000 - step };
                break;
            }
            for (let dist = 36; !best && dist <= maxDist; dist += 4) {
                for (let deg = -100; deg <= 100; deg += 4) {
                    const ang = deg * Math.PI / 180;
                    const dirX = ux * Math.cos(ang) - uy * Math.sin(ang);
                    const dirY = uy * Math.cos(ang) + ux * Math.sin(ang);
                    const x = seat.x + dirX * dist;
                    const y = seat.y + dirY * dist;
                    if (!chipClear(index, x, y, gap)) continue;
                    const centred = Math.abs(x - seat.x) <= 1.5;
                    // Centred and close: directly in front of this seat.
                    const score = (centred ? 10_000 : 0) - dist - Math.abs(deg) * 2;
                    if (!best || score > best.score) best = { x: centred ? seat.x : x, y, score };
                }
            }
            if (!best) return;
            point.x = Math.round(best.x);
            point.y = Math.round(best.y);
            remember(index, point.x, point.y);
        });
        // Seats 4–7 sit under their own action boxes. The search above leaves
        // about 12 screen px of air. Pull each pile straight up, keeping its
        // x, until the pile top is 3 screen px under that box. Stop if the
        // next pixel would leave the felt or cover a card.
        // 20 table px covers a two-denomination cluster. One chip is 16.
        // The pill is taller than that on a short phone, so the phone gap
        // stays the 5px screen target. A tall tablet uses the cluster.
        const visualHalf = Math.max(pillHalf, 20);
        const tuckUnderBanner = (index: number) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (!point || !seat) return;
            const bannerBottom = seat.y + seatHY + 33;
            const targetY = Math.round(bannerBottom + 5 / z + visualHalf);
            const x = point.x;
            let best = Math.round(point.y);
            if (targetY >= best) return;
            const clear = (y: number) => {
                if (y - visualHalf < bannerBottom + 2 / z) return false;
                if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
                const pile = { x, y, hw: labelHalf, hy: visualHalf };
                if (boxesOverlap(pile, bannerOf(seat), 0)) return false;
                if (seatBoxes.some((other, otherIndex) => otherIndex !== index && boxesOverlap(pile, bannerOf(other), 2))) return false;
                if (holeCards.some(card => boxesOverlap({ x, y, hw: chipHX, hy: visualHalf }, card, 0))) return false;
                if (board.some(item => !item.soft && boxesOverlap({ x, y, hw: chipHX, hy: visualHalf }, item, 2))) return false;
                return true;
            };
            for (let y = best - 1; y >= targetY; y--) {
                if (!clear(y)) break;
                best = y;
            }
            if (best === Math.round(point.y)) return;
            point.y = best;
            remember(index, x, best);
        };
        [3, 4, 5, 6].forEach(tuckUnderBanner);
        // Seats 3 and 8 sit on the hole cards, and the fan covers the chip.
        // Park each pile with its top level with the top of its own cards.
        // Seat 3 starts just past the right edge. Seat 8 ends just before
        // the left edge. Every other seat stays where the passes above left it.
        const besideOwnCards = (index: number, side: 1 | -1) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            const card = holeCards[index];
            if (!point || !seat || !card) return;
            const half = labelHalf;
            const topHalf = pillHalf;
            const cardEdge = side > 0 ? card.x + card.hw : card.x - card.hw;
            const cardTop = card.y - card.hy;
            const targetX = Math.round(cardEdge + side * (3 / z + half));
            const targetY = Math.round(cardTop + topHalf);
            const clear = (x: number, y: number) => {
                if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
                if (!ownedBy(x, y, index)) return false;
                const pile = { x, y, hw: half, hy: topHalf };
                if (boxesOverlap(pile, card, 2 / z)) return false;
                if (holeCards.some((other, otherIndex) => otherIndex !== index && boxesOverlap(pile, other, 2))) return false;
                if (board.some(item => !item.soft && boxesOverlap({ x, y, hw: chipHX, hy: topHalf }, item, 2))) return false;
                if (boxesOverlap(pile, bannerOf(seat), 0)) return false;
                if (seatBoxes.some((other, otherIndex) => otherIndex !== index && boxesOverlap(pile, bannerOf(other), 2))) return false;
                return true;
            };
            if (clear(targetX, targetY)) {
                point.x = targetX;
                point.y = targetY;
                remember(index, targetX, targetY);
                return;
            }
            // The curved rail or a neighbour can block the ideal corner.
            // Step away from the cards, then down, and stop at the first
            // spot that still reads as this seat.
            let best: { x: number; y: number } | null = null;
            for (let step = 0; step <= 80 && !best; step += 4) {
                const tries = [
                    { x: targetX + side * step, y: targetY },
                    { x: targetX, y: targetY + step },
                    { x: targetX + side * step, y: targetY + step }
                ];
                for (const candidate of tries) {
                    if (!clear(candidate.x, candidate.y)) continue;
                    best = candidate;
                    break;
                }
            }
            if (!best) return;
            point.x = best.x;
            point.y = best.y;
            remember(index, best.x, best.y);
        };
        besideOwnCards(2, 1);
        besideOwnCards(7, -1);
    }
    // 2-seat and 6-seat. A label wider than the badge, or a pill wider than
    // the search box, still clips the action banner after the passes above.
    // Step the pile off that banner without leaving its seat.
    if (landscapeTable && tableSize !== 9) {
        const labelHalf = Math.max(pileHX, 34 / z);
        const bannerHalf = 44 * unitStage + 12;
        // The painted box hangs a little lower than seatHY - 22 + 27.5, so a
        // pile that the model calls clear still clips the top of the box.
        const banners = seatBoxes.map(seat => ({
            x: seat.x,
            y: seat.y + seatHY - 22 + 27.5 + 16,
            hw: bannerHalf,
            hy: 27.5 + 8
        }));
        const clipped = (x: number, y: number) =>
            banners.some(banner => boxesOverlap({ x, y, hw: labelHalf, hy: pillHalf }, banner, 4));
        seatBoxes.forEach((seat, index) => {
            const point = chipCenters[index];
            if (!point || !clipped(point.x, point.y)) return;
            const inward = Math.sign(cx - seat.x) || 1;
            const yDir = Math.sign(cy - seat.y) || 1;
            let best: { x: number; y: number; score: number } | null = null;
            const xCap = Math.abs(cx - seat.x) * 0.31;
            for (let step = 4; step <= 48; step += 4) {
                const tries = [
                    { x: point.x, y: point.y - yDir * step },
                    { x: point.x, y: point.y + yDir * step },
                    { x: point.x + inward * step, y: point.y }
                ];
                for (const candidate of tries) {
                    if (candidate.x !== point.x && Math.abs(candidate.x - seat.x) > xCap) continue;
                    if (clipped(candidate.x, candidate.y)) continue;
                    if (!boxOnFelt(candidate.x, candidate.y, pileHX, feltHY)) continue;
                    const score = Math.hypot(candidate.x - point.x, candidate.y - point.y);
                    if (!best || score < best.score) best = { ...candidate, score };
                }
                if (best) break;
            }
            if (!best) return;
            point.x = Math.round(best.x);
            point.y = Math.round(best.y);
            remember(index, point.x, point.y);
        });
    }
    // Mobile landscape only. The chip icon hangs left of the anchor and the
    // amount sits to the right, and the dealer disc hangs up-left of the
    // seat number. A symmetric search box is wider than the amount, so it
    // either refuses to move or shoves a pile that the disc does not touch.
    if (landscapeTable) {
        const chipPx = (bigChips || shortLandscape) ? 32 : 28;
        const overhang = chipPx * 0.45;
        // "$0.08" at the counter-zoomed 17px label, plus the pill padding.
        // The icon's margin sits inside the centred box, so both sides match.
        const labelScreen = 58;
        const textHalf = ((chipPx * 0.55 + 2) * z + labelScreen + 7) / 2 / z;
        const pileHalf = textHalf + overhang / 2;
        const badgeR = 9.5 * unitStage;
        const dealerR = 11 * unitStage;
        const dealerShift = (badgeR + dealerR + 3 / z) / Math.SQRT2;
        const dealerOf = (seat: KeepOut): KeepOut => ({
            x: seat.x - 31.5 * unitStage - dealerShift,
            y: seat.y + 23 * unitStage - dealerShift,
            hw: dealerR,
            hy: dealerR
        });
        const stillThisSeat = (index: number, x: number, y: number) => {
            if (!boxOnFelt(x, y, pileHX, feltHY)) return false;
            const own = Math.hypot(x - seatBoxes[index].x, y - seatBoxes[index].y);
            const margin = 8 / z;
            if (!seatBoxes.every((other, otherIndex) => otherIndex === index || own + margin < Math.hypot(x - other.x, y - other.y))) return false;
            if (board.some(item => !item.soft && boxesOverlap({ x, y, hw: chipHX, hy: pillHalf }, item, 2))) return false;
            return true;
        };
        // The disc covers the amount when it sits to the right of the anchor,
        // and the icon when it sits to the left. A disc that only grazes the
        // pill from above is not covering it: requiring air there shoves the
        // 9-seat seat 8 pile, which the painted disc does not touch.
        const hitsDealer = (x: number, y: number, dealer: KeepOut) => {
            const crossing = Math.abs(y - dealer.y) < pillHalf;
            const air = crossing ? 3 / z : 0;
            return Math.abs(x - dealer.x) < pileHalf + dealer.hw + air
                && Math.abs(y - dealer.y) < pillHalf + dealer.hy + air;
        };
        const hitsOwnCard = (x: number, y: number, card: KeepOut) => {
            const left = x - pileHalf;
            const right = x + pileHalf;
            const xHit = right > card.x - card.hw && left < card.x + card.hw;
            const yHit = Math.abs(y - card.y) < pillHalf + card.hy;
            return xHit && yHit;
        };
        // 6-seat seat 3: the hole cards cover the chip icon. Step inward,
        // keeping the height, until the icon and the amount clear the fan.
        if (tableSize === 6) {
            const index = 2;
            const point = chipCenters[index];
            const card = holeCards[index];
            const seat = seatBoxes[index];
            if (point && card && seat) {
                const inward = Math.sign(cx - seat.x) || 1;
                const cardEdge = inward > 0 ? card.x + card.hw : card.x - card.hw;
                const raw = cardEdge + inward * (4 / z + pileHalf);
                const targetX = inward > 0 ? Math.ceil(raw) : Math.floor(raw);
                const y = Math.round(point.y);
                const start = Math.round(point.x);
                const clearOfCards = (x: number) => inward > 0
                    ? x - pileHalf >= cardEdge + 4 / z - 0.5
                    : x + pileHalf <= cardEdge - 4 / z + 0.5;
                if ((inward > 0 && targetX > start) || (inward < 0 && targetX < start)) {
                    let best = start;
                    for (let x = start + inward; inward > 0 ? x <= targetX : x >= targetX; x += inward) {
                        if (!stillThisSeat(index, x, y)) break;
                        best = x;
                        if (clearOfCards(x)) break;
                    }
                    if (best !== start && clearOfCards(best)) {
                        point.x = best;
                        remember(index, best, y);
                    }
                }
            }
        }
        // Step a pile inward until the dealer disc no longer touches it.
        // The button stays on the badge.
        seatBoxes.forEach((seat, index) => {
            const point = chipCenters[index];
            if (!point) return;
            const dealer = dealerOf(seat);
            const y = Math.round(point.y);
            const start = Math.round(point.x);
            if (!hitsDealer(start, y, dealer)) return;
            const inward = Math.sign(cx - seat.x) || 1;
            let best = start;
            for (let step = 1; step <= 180; step++) {
                const x = start + inward * step;
                if (!stillThisSeat(index, x, y)) break;
                const card = holeCards[index];
                if (card && hitsOwnCard(x, y, card)) continue;
                best = x;
                if (!hitsDealer(x, y, dealer)) break;
            }
            const card = holeCards[index];
            if (best === start || hitsDealer(best, y, dealer)) return;
            if (card && hitsOwnCard(best, y, card)) return;
            point.x = best;
            remember(index, best, y);
        });
        // 2-seat seat 2. The banner passes only walk a pile downward, so a
        // bet that is already under the box stays where the search left it,
        // about 11-20px below RAISE TO. Pull it up until the painted pile
        // (the four 1¢ chips of a $0.04 bet, which stick up once they are
        // taller than the pill) sits ~3px under the banner. X stays on the
        // seat. The painted box hangs ~3 table px below the 55px model.
        if (tableSize === 2) {
            const index = 1;
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (point && seat) {
                const chipPx = (bigChips || shortLandscape) ? 32 : 28;
                const stackScreen = (chipPx + 12) * z;
                const overhang = Math.max(0, (stackScreen - 22.67) / 2);
                const x = Math.round(seat.x);
                let y = Math.round(seat.y + seatHY + 33 + pillHalf + (3 + overhang) / z + 3);
                const clear = (yy: number) => {
                    if (!boxOnFelt(x, yy, pileHX, feltHY)) return false;
                    if (holeCards.some(card => boxesOverlap({ x, y: yy, hw: chipHX, hy: pillHalf }, card, 0))) return false;
                    if (board.some(item => !item.soft && boxesOverlap({ x, y: yy, hw: chipHX, hy: pillHalf }, item, 2))) return false;
                    return true;
                };
                if (!clear(y)) {
                    const limit = y + Math.round(40 / z);
                    for (let yy = y + 1; yy <= limit; yy++) {
                        if (!clear(yy)) continue;
                        y = yy;
                        break;
                    }
                }
                point.x = x;
                point.y = y;
                remember(index, x, y);
            }
        }
        // 6-seat seat 5. The dealer walk stops on a box wider than the
        // painted $0.10 pill, which leaves the amount ~10px short of the
        // disc. Step right, at the same height, until that pill is ~3px
        // from the disc. The button stays on the badge.
        if (tableSize === 6) {
            const index = 4;
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (point && seat) {
                const chipPx = (bigChips || shortLandscape) ? 32 : 28;
                const paintedHalf = (chipPx * z + 2 * z + 51) / 2 / z;
                const dealer = dealerOf(seat);
                const y = Math.round(point.y);
                const target = Math.floor(dealer.x - dealer.hw - 3 / z - paintedHalf);
                const start = Math.round(point.x);
                if (target > start) {
                    let best = start;
                    for (let x = start + 1; x <= target; x++) {
                        if (!stillThisSeat(index, x, y)) break;
                        best = x;
                    }
                    if (best !== start) {
                        point.x = best;
                        remember(index, best, y);
                    }
                }
            }
        }
    }
    // Portrait. Push any pile that still touches a banner, a hole card or its
    // dealer button toward the table centre, on the axis where the overlap is
    // thinner. Landscape passes above do not run on this felt.
    if (!landscapeTable) {
        const pileHW = 42 / z;
        const pileHH = 16 / z;
        const air = 4 / z;
        const dealerR = 11 * unitStage;
        const dealerShift = (9.5 * unitStage + dealerR + 3 / z) / Math.SQRT2;
        const banners: KeepOut[] = seatBoxes.map(seat => ({
            x: seat.x,
            y: seat.y + seatHY - 22 + 27.5,
            hw: 146,
            hy: 27.5
        }));
        const dealers: KeepOut[] = seatBoxes.map(seat => ({
            x: seat.x - 31.5 * unitStage - dealerShift,
            y: seat.y + 23 * unitStage - dealerShift,
            hw: dealerR,
            hy: dealerR
        }));
        seatBoxes.forEach((seat, index) => {
            const point = chipCenters[index];
            if (!point) return;
            const obstacles = [...banners, ...holeCards, dealers[index]];
            for (let iter = 0; iter < 12; iter++) {
                let pushed = false;
                for (const box of obstacles) {
                    const overlapX = pileHW + box.hw + air - Math.abs(point.x - box.x);
                    const overlapY = pileHH + box.hy + air - Math.abs(point.y - box.y);
                    if (overlapX <= 0 || overlapY <= 0) continue;
                    const towardX = Math.sign(cx - seat.x) || Math.sign(point.x - box.x) || 1;
                    const towardY = Math.sign(cy - seat.y) || Math.sign(point.y - box.y) || 1;
                    const nextX = overlapX <= overlapY ? point.x + towardX * (overlapX + 1) : point.x;
                    const nextY = overlapX <= overlapY ? point.y : point.y + towardY * (overlapY + 1);
                    // The centre has to stay on the felt. The wide search box
                    // would refuse the last few pixels and leave a graze.
                    if (!mobileFeltContains(nextX, nextY, 1, 0)) continue;
                    point.x = nextX;
                    point.y = nextY;
                    pushed = true;
                }
                if (!pushed) break;
            }
            remember(index, point.x, point.y);
        });
        // Portrait pill is the 36px label. A short stack of cent chips sticks
        // out of that pill; the painted banner and the painted cards each sit
        // about 3 stage px off the 55px / fan model.
        const chipPx = bigChips ? 32 : 28;
        const stackScreen = (chipPx + 12) * z;
        const overhang = Math.max(0, (stackScreen - 36 * z) / 2);
        const pillHalfPortrait = 18;
        // A second denomination sits up on the cluster, so the painted pile
        // hangs about 4px lower than a single stack of cent chips.
        const stackHalf = (chipPx + 12) / 2 + 4;
        // A centred pile whose outer edge would leave the felt moves inward
        // by just enough for that edge to sit inside the rail.
        const clampToRail = (seatX: number) => {
            const inward = Math.sign(cx - seatX) || 0;
            if (!inward) return Math.round(seatX);
            const railAir = Math.max(4, 3 / z);
            const outer = seatX - inward * chipHX;
            const outerLimit = inward > 0 ? railAir : dims.tableWidth - railAir;
            const past = inward > 0 ? outerLimit - outer : outer - outerLimit;
            if (past <= 0) return Math.round(seatX);
            return Math.round(seatX + inward * past);
        };
        // Centred top bet, ~3px under its action banner. Side seats on the
        // rail clamp inward so the pile stays on the felt.
        const underBanner = (index: number, clamp = false, extra = 0) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            if (!point || !seat) return;
            const x = clamp ? clampToRail(seat.x) : Math.round(seat.x);
            let y = Math.round(seat.y + seatHY + 33 + pillHalfPortrait + (3 + overhang) / z + 3 + extra);
            const clear = (yy: number) => {
                if (!mobileFeltContains(x, yy, 1, 0)) return false;
                if (holeCards.some(card => boxesOverlap({ x, y: yy, hw: chipHX, hy: pillHalfPortrait }, card, 0))) return false;
                if (board.some(item => !item.soft && boxesOverlap({ x, y: yy, hw: chipHX, hy: pillHalfPortrait }, item, 2))) return false;
                return true;
            };
            if (!clear(y)) {
                const limit = y + Math.round(40 / z);
                for (let yy = y + 1; yy <= limit; yy++) {
                    if (!clear(yy)) continue;
                    y = yy;
                    break;
                }
            }
            point.x = x;
            point.y = y;
            remember(index, x, y);
        };
        // Just above that seat's cards. Clamped inward only when the pile
        // would leave the felt, unless the caller asks for the seat centre.
        const aboveCards = (index: number, avoidBanners = false, bannerDrop = 0, clamp = true) => {
            const point = chipCenters[index];
            const seat = seatBoxes[index];
            const card = holeCards[index];
            if (!point || !seat || !card) return;
            const inward = Math.sign(cx - seat.x) || 1;
            let x = clamp ? clampToRail(seat.x) : Math.round(seat.x);
            let y = Math.round(card.y - card.hy - stackHalf - 3 / z - 3);
            const clear = (yy: number) => {
                if (!mobileFeltContains(x, yy, 1, 0)) return false;
                if (!mobileFeltContains(x - inward * chipHX, yy, 1, 0)) return false;
                if (board.some(item => !item.soft && boxesOverlap({ x, y: yy, hw: chipHX, hy: stackHalf }, item, 2))) return false;
                return true;
            };
            // The painted action box sits a few stage px below this model.
            // `bannerDrop` closes that gap for a pile that actually hangs into it.
            const blocksBanner = (yy: number) => banners.some((banner, bannerIndex) =>
                bannerIndex !== index && boxesOverlap(
                    { x, y: yy, hw: chipHX, hy: stackHalf },
                    bannerDrop ? { ...banner, y: banner.y + bannerDrop } : banner,
                    2
                ));
            let covered = avoidBanners && blocksBanner(y);
            if (!clear(y) || covered) {
                const cardLimit = Math.round(card.y - card.hy - stackHalf - 1);
                const limit = Math.min(cardLimit, y + Math.round(24 / z));
                for (let yy = y + 1; yy <= limit; yy++) {
                    if (!clear(yy) || (avoidBanners && blocksBanner(yy))) continue;
                    y = yy;
                    covered = false;
                    break;
                }
            }
            // Dropping onto the cards can still leave a tall pile under the
            // next seat's banner. The shared banner box is the wide RAISE
            // label; short labels are about 83px on screen. Slide inward only
            // until that short box is clear.
            if (covered) {
                const shortHW = Math.round(42 / z);
                const air = Math.round(3 / z);
                const bannerClose = () => banners.some((banner, bannerIndex) =>
                    bannerIndex !== index && boxesOverlap(
                        { x, y, hw: chipHX, hy: stackHalf },
                        { ...banner, y: banner.y + bannerDrop, hw: shortHW },
                        air
                    ));
                const dir = Math.sign(cx - x) || 1;
                for (let step = 0; step < 160 && bannerClose(); step++) x += dir;
            }
            point.x = x;
            point.y = y;
            remember(index, x, y);
        };
        // 2-seat seat 2. The separation above only walks a pile toward the
        // centre, so the top bet stays several pixels under RAISE TO.
        if (tableSize === 2) underBanner(1);
        // 4-seat. Seat 3 (top) sits under CALL. Seats 2 and 4 sit just above
        // their own cards, on the seat's own centre.
        if (tableSize === 4) {
            underBanner(2);
            [1, 3].forEach(index => {
                const point = chipCenters[index];
                const seat = seatBoxes[index];
                const card = holeCards[index];
                if (!point || !seat || !card) return;
                const x = Math.round(seat.x);
                const y = Math.round(card.y - card.hy - stackHalf - 3 / z - 3);
                point.x = x;
                point.y = y;
                remember(index, x, y);
            });
        }
        // 6-seat. Seats 3, 4 and 5 sit under their own banners. Seats 2 and
        // 6 sit above their cards. All five are on the seat centre.
        if (tableSize === 6) {
            // Seat 4's preview pile is a second denomination stacked on the
            // cents, so it hangs about 4 stage px below the single-stack model.
            underBanner(3, false, 4);
            underBanner(2, false);
            underBanner(4, false);
            aboveCards(1, false, 0, false);
            aboveCards(5, false, 0, false);
        }
        // 9-seat. Seats 2, 3, 8 and 9 sit above their own cards. Seats 4–7
        // sit under their own banners. A centred pile is clamped inward only
        // when it would leave the felt. Seats 5 and 6 stay on their own
        // centres so the two top piles do not meet.
        if (tableSize === 9) {
            // A second denomination hangs below the single-stack model.
            // Seat 7's pile is the taller of the two.
            underBanner(3, true, 4);
            underBanner(4, true);
            // Seat 6's pile is a cent stack beside a 10¢ chip, so it hangs
            // a little lower than the single-chip model.
            underBanner(5, true, 3);
            underBanner(6, true, 6);
            [1, 2, 7].forEach(index => aboveCards(index, true));
            // Seat 9's preview pile is the tall 10¢+5¢ stack. The painted
            // banner hangs below the model, and on a short phone the cards
            // are already against the pile, so it steps inward off that banner.
            aboveCards(8, true, 5);
            // Seats 5 and 6 stay under their banners. On a short phone those
            // piles meet the next seat's cards, so each moves toward the
            // centre only until the cards are clear, and not so far that the
            // two piles meet.
            const pileHalf = 74;
            const nudgeOffCards = (index: number, dir: number) => {
                const point = chipCenters[index];
                if (!point) return;
                const hits = () => holeCards.some((card, cardIndex) =>
                    cardIndex !== index && boxesOverlap({ x: point.x, y: point.y, hw: pileHalf, hy: pillHalfPortrait }, card, 8));
                for (let step = 0; step < 80 && hits(); step++) point.x += dir;
                remember(index, point.x, point.y);
            };
            nudgeOffCards(4, 1);
            nudgeOffCards(5, -1);
            const leftPile = chipCenters[4];
            const rightPile = chipCenters[5];
            if (leftPile && rightPile) {
                const gap = rightPile.x - 78 - (leftPile.x + 70);
                if (gap < 8) {
                    const push = 8 - gap;
                    const rightPush = Math.round(push * 0.35);
                    leftPile.x -= Math.round(push - rightPush);
                    rightPile.x += rightPush;
                    remember(4, leftPile.x, leftPile.y);
                    remember(5, rightPile.x, rightPile.y);
                }
            }
            // Seats 2, 3, 4, 6, 7, 8 and 9 keep the height above and sit on
            // the seat centre. Seat 5 stays where it was.
            [1, 2, 3, 5, 6, 7, 8].forEach(index => {
                const point = chipCenters[index];
                const seat = seatBoxes[index];
                if (!point || !seat) return;
                point.x = Math.round(seat.x);
                remember(index, point.x, point.y);
            });
            // On a short phone the centred seat 6 pile runs into seat 7's
            // cards. Step toward the table only until those cards are clear.
            nudgeOffCards(5, -1);
        }
    }
    const chips = seatBoxes.map((_, index) => {
        const point = chipCenters[index] ?? seatBoxes[index];
        return { left: `${Math.round(point.x)}px`, top: `${Math.round(point.y)}px`, bottom: "0px" };
    });
    return { ...positions, chips };
}
