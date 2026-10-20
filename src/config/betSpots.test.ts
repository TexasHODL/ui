import { betSideFor, dealerSideFor, mobileBetBoard, placeBetSpots, seatEnvelope, getAllPositions, getStageDims, withBetSpots, type TableSize } from "./stageGeometry";

const W = 1000;
const H = 500;
const env = seatEnvelope(false);
const box = (spot: { left: string; top?: string; side?: string }) => {
    const x = parseFloat(spot.left);
    const y = parseFloat(spot.top ?? "0");
    const halfH = Math.max(env.groupHalfH, env.buttonW / 2);
    if (spot.side === "left") return { l: x - env.groupW / 2, r: x + env.groupW / 2 + env.buttonW, t: y - halfH, b: y + halfH };
    return { l: x - env.groupW / 2 - env.buttonW, r: x + env.groupW / 2, t: y - halfH, b: y + halfH };
};
const overlap = (p: ReturnType<typeof box>, q: ReturnType<typeof box>) => p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;

describe("bet spots beside the seat", () => {
    it("classifies seats by felt edge", () => {
        expect(betSideFor(500, -40, W, H)).toBe("top");
        expect(betSideFor(275, 540, W, H)).toBe("bottom");
        expect(betSideFor(20, 250, W, H)).toBe("left");
        expect(betSideFor(980, 100, W, H)).toBe("right");
    });

    it("puts the button left of the chips except on the left arc", () => {
        expect(dealerSideFor("top")).toBe("left");
        expect(dealerSideFor("bottom")).toBe("left");
        expect(dealerSideFor("right")).toBe("left");
        expect(dealerSideFor("left")).toBe("right");
    });

    it("centres top bets on the seat's x, below the seat and its banner", () => {
        const [spot] = placeBetSpots([{ left: "500px", top: "-47px" }], env, W, H);
        expect(spot.side).toBe("top");
        expect(parseFloat(spot.left)).toBe(500);
        expect(parseFloat(spot.top ?? "NaN")).toBe(-47 + env.below + env.gap + env.groupHalfH);
    });

    it("centres bottom bets on the seat's x, above the hole cards", () => {
        const [spot] = placeBetSpots([{ left: "500px", top: "547px" }], env, W, H);
        expect(spot.side).toBe("bottom");
        expect(parseFloat(spot.left)).toBe(500);
        expect(parseFloat(spot.top ?? "NaN")).toBe(547 - env.above - env.gap - env.groupHalfH);
    });

    it("puts an upper-half side seat's bet under its pill, centred on its x", () => {
        // 9-max seat 4 (upper-left corner).
        const [spot] = placeBetSpots([{ left: "84.1px", top: "22.5px" }], env, W, H);
        expect(spot.side).toBe("left");
        expect(parseFloat(spot.left)).toBeCloseTo(84.1, 1);
        expect(parseFloat(spot.top ?? "NaN")).toBeCloseTo(22.5 + env.below + env.gap + env.groupHalfH, 1);
    });

    it("puts a lower-half side seat's bet above its hole cards, centred on its x", () => {
        // 9-max seat 8 (right end, below the felt's middle). The button is on the left.
        const [spot] = placeBetSpots([{ left: "1004.1px", top: "351.6px" }], env, W, H);
        expect(spot.side).toBe("right");
        expect(parseFloat(spot.left)).toBeCloseTo(1004.1, 1);
        expect(parseFloat(spot.top ?? "NaN")).toBeCloseTo(351.6 - env.above - env.gap - env.groupHalfH, 1);
    });

    it("never moves a rail-end bet off the seat's x, so the group stays centred on the pill", () => {
        const [left, right] = placeBetSpots([{ left: "-55px", top: "351px" }, { left: "1055px", top: "351px" }], env, W, H);
        expect(parseFloat(left.left)).toBe(-55);
        expect(parseFloat(right.left)).toBe(1055);
    });

    it("uses the seat's other side when the preferred spot is on the board and the other side is clear", () => {
        const board = [{ x: 500, y: 250, hw: 100, hy: 60 }];
        const [spot] = placeBetSpots([{ left: "500px", top: "120px" }], env, W, H, board);
        expect(parseFloat(spot.top ?? "NaN")).toBeCloseTo(120 - env.above - env.gap - env.groupHalfH, 1);
    });

    it("keeps the preferred side when flipping would land on another seat's bet", () => {
        const board = [{ x: 500, y: 250, hw: 100, hy: 60 }];
        const seats = [{ left: "500px", top: "120px" }, { left: "520px", top: "-95px" }];
        const [spot] = placeBetSpots(seats, env, W, H, board);
        expect(parseFloat(spot.top ?? "NaN")).toBeCloseTo(120 + env.below + env.gap + env.groupHalfH, 1);
    });

    it("matches Andrew's 9-max reference: 4, 5, 6, 7 under the pill; 1, 2, 3, 8, 9 above", () => {
        const positions = withBetSpots(getAllPositions(9), false);
        const under = positions.chips.map((chip, i) => parseFloat(chip.top ?? "0") > parseFloat(positions.players[i].top));
        expect(under).toEqual([false, false, false, true, true, true, true, false, false]);
    });

    it.each([
        [2, false], [4, false], [6, false], [9, false],
        [2, true], [4, true], [6, true], [9, true],
    ] as [TableSize, boolean][])("%i seats (mobile=%s): every bet's x is its seat's x", (size, mobile) => {
        const positions = withBetSpots(getAllPositions(size), mobile, 1.95);
        positions.chips.forEach((chip, i) => expect(parseFloat(chip.left)).toBe(parseFloat(positions.players[i].left)));
    });

    it.each([2, 4, 6, 9] as TableSize[])("desktop %i seats: every bet + button clears the others", size => {
        const positions = withBetSpots(getAllPositions(size), false);
        const dims = getStageDims();
        expect(dims.tableWidth).toBe(1000);
        const boxes = positions.chips.map(box);
        boxes.forEach((p, i) => boxes.forEach((q, j) => { if (i < j) expect(overlap(p, q)).toBe(false); }));
        positions.chips.forEach((chip, i) => {
            const seatX = parseFloat(positions.players[i].left);
            const seatY = parseFloat(positions.players[i].top);
            const x = parseFloat(chip.left);
            // Centred on the seat's x unless clamped onto the felt.
            // Chips+amount group centred exactly on the pill's x.
            expect(x).toBeCloseTo(seatX, 5);
            // Directly under (upper half) or above (lower half) the seat, close to it.
            const dy = parseFloat(chip.top ?? "0") - seatY;
            expect(Math.abs(dy)).toBeLessThan(110);
        });
    });

    it("mobile portrait 6-max: seats 3 and 5 keep their bets UNDER the player; other tables still flip off the board", () => {
        const board = [{ x: 500, y: 250, hw: 100, hy: 60 }];
        expect(mobileBetBoard(6, true, board)).toEqual([]);
        expect(mobileBetBoard(9, true, board)).toBe(board);
        expect(mobileBetBoard(6, false, board)).toBe(board);
        // An upper-half seat whose under spot is on the board stays under with no keep-out.
        const seat = [{ left: "500px", top: "120px" }];
        const [kept] = placeBetSpots(seat, env, W, H, mobileBetBoard(6, true, board));
        expect(parseFloat(kept.top ?? "NaN")).toBeCloseTo(120 + env.below + env.gap + env.groupHalfH, 1);
        expect(parseFloat(kept.left)).toBe(500);
        const [flipped] = placeBetSpots(seat, env, W, H, mobileBetBoard(9, true, board));
        expect(parseFloat(flipped.top ?? "NaN")).toBeCloseTo(120 - env.above - env.gap - env.groupHalfH, 1);
    });
});
