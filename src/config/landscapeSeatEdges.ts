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
 * Mobile bet chips sit just inside the rail, in front of their own seat. The
 * dealer button sits on that seat's shoulder, still closer to it than to either
 * neighbour. Both stay off seats, hole cards, community cards and the pot.
 * Desktop keeps the hand-tuned offsets in stageGeometry.
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
    const holes = positions.players.map(seat => holeCardBox(parseFloat(seat.left), parseFloat(seat.top), seatHX, seatHY, unitStage));
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

function holeCardBox(sx: number, sy: number, seatHX: number, _seatHY: number, unitStage: number): KeepOut {
    // The fan is the top 51 units of the 71-unit seat. An 8° rotation sticks
    // a few units past the seat's top edge (toward the felt on a bottom seat).
    const cardH = 51 * unitStage;
    const cardW = 74 * unitStage;
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
    // label; short landscape uses the compact label from Chip.tsx. The dealer
    // button is the 48px element centred on its point.
    const seatHX = 48 * unitStage;
    const seatHY = 35.5 * unitStage;
    // Chip.tsx uses the large pill only when the viewport is phone-sized. A
    // 1024×650 landscape window fails that test and renders the smaller label.
    const shortLandscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    const bigChips = typeof window !== "undefined" && (window.innerWidth <= 768 || window.innerHeight <= 500) && !shortLandscape;
    const chipHX = bigChips ? 86 : shortLandscape ? 72 : 54;
    const chipHY = 26;
    const dealerHalf = 24;
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
    const holeCards = seatBoxes.map(seat => holeCardBox(seat.x, seat.y, seatHX, seatHY, unitStage));
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
            // Chips stay inward of the seat. The dealer may sit on the
            // shoulder, including slightly outside the rail, so it can clear
            // the hole cards when those cards fill the inward gap.
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
        // The inward point is under the hole cards. Step along the seat's
        // shoulders until the button is beside the seat and still this player's.
        if (preferred !== 0) {
            const tx = -uy;
            const ty = ux;
            const accept = (x: number, y: number) => {
                if (!owned(x, y)) return false;
                const box = { x, y, hw: halfX, hy: halfY };
                return !hard.some(item => boxesOverlap(box, item, minGap));
            };
            // Outside the rail, beside the player. The inward gap is the hole
            // cards; this side of the seat is clear and still this player's.
            for (let dist = 16; dist <= 90; dist += 4) {
                for (const side of [0, 1, -1]) {
                    const x = sx - ux * dist + tx * side * dist * 0.6;
                    const y = sy - uy * dist + ty * side * dist * 0.6;
                    if (accept(x, y)) return { x, y };
                }
            }
            for (let dist = 16; dist <= 150; dist += 4) {
                for (const sign of [1, -1]) {
                    const x = sx + tx * sign * dist + ux * (8 / z);
                    const y = sy + ty * sign * dist + uy * (8 / z);
                    if (accept(x, y)) return { x, y };
                }
            }
        }
        const fallback = Math.min(clearOf(ux, uy, halfX, halfY), cap);
        return { x: sx + ux * fallback, y: sy + uy * fallback };
    };

    // Chips prefer the straight inward point. The dealer prefers a shoulder
    // just off that ray so it is not sitting on the chip or the next seat.
    const chipAngles = [0, 0.18, -0.18, 0.36, -0.36];
    const dealerAngles = [1.2, -1.2, 1.57, -1.57, 1.45, -1.45, 0.9, -0.9, 0.55, -0.55];
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
        // label, still keeps the dealer button off the bet.
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
    const chips = seatBoxes.map((_, index) => {
        const point = chipCenters[index] ?? seatBoxes[index];
        return { left: `${Math.round(point.x)}px`, top: `${Math.round(point.y)}px`, bottom: "0px" };
    });
    const dealers = seatBoxes.map((seat, index) => {
        // The button may sit in the seat's padding so it stays on this player's
        // side of the gap. Hole cards are still a hard boundary.
        const point = choose(seat.x, seat.y, index, dealerHalf, dealerHalf, dealerAngles, 1.2, placedChips, 28);
        return { left: `${Math.round(point.x)}px`, top: `${Math.round(point.y)}px` };
    });
    return { ...positions, chips, dealers };
}
