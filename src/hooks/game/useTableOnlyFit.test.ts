import { computeTableOnlyFit, fitTransform, IDENTITY_FIT } from "./useTableOnlyFit";

const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe("computeTableOnlyFit (table-only view)", () => {
    it("shrinks content that is clipped at the sides and centres it in the target", () => {
        const fit = computeTableOnlyFit([box(-20, 10, 820, 300)], [], box(10, 10, 790, 410));
        expect(fit.scale).toBeCloseTo(780 / 840, 4);
        const left = -20 * fit.scale + fit.dx;
        const right = 820 * fit.scale + fit.dx;
        expect(left).toBeCloseTo(10, 4);
        expect(right).toBeCloseTo(790, 4);
    });

    const placed = (b: ReturnType<typeof box>, f: { scale: number; dx: number; dy: number }) =>
        box(b.left * f.scale + f.dx, b.top * f.scale + f.dy, b.right * f.scale + f.dx, b.bottom * f.scale + f.dy);
    const clear = (a: ReturnType<typeof box>, o: ReturnType<typeof box>) =>
        a.right <= o.left || a.left >= o.right || a.bottom <= o.top || a.top >= o.bottom;

    it("scales content up to fill the target when there is room", () => {
        const fit = computeTableOnlyFit([box(100, 100, 300, 200)], [], box(0, 0, 1000, 1000));
        expect(fit.scale).toBeCloseTo(5, 4);
    });

    it("does not shrink for a corner pill that no seat touches", () => {
        const seats = [box(300, 0, 500, 60), box(0, 320, 100, 380), box(700, 320, 800, 380)];
        const free = computeTableOnlyFit(seats, [], box(0, 0, 800, 400));
        const fit = computeTableOnlyFit(seats, [box(650, 12, 750, 52)], box(0, 0, 800, 400));
        expect(fit.scale).toBeCloseTo(free.scale, 4);
    });

    it("slides or shrinks the table so a colliding seat clears an overlay", () => {
        const seats = [box(0, 0, 800, 60), box(0, 320, 800, 380)];
        const pill = box(650, 12, 750, 52);
        const fit = computeTableOnlyFit(seats, [pill], box(10, 10, 790, 410));
        for (const s of seats) {
            const p = placed(s, fit);
            expect(clear(p, pill)).toBe(true);
            expect(p.bottom).toBeLessThanOrEqual(410.01);
            expect(p.top).toBeGreaterThanOrEqual(9.99);
        }
    });

    it("keeps seats clear of a bottom-left pill", () => {
        const seats = [box(0, 0, 780, 60), box(0, 340, 780, 400)];
        const pill = box(12, 368, 137, 412);
        const fit = computeTableOnlyFit(seats, [pill], box(10, 10, 790, 410));
        for (const s of seats) expect(clear(placed(s, fit), pill)).toBe(true);
    });

    it("centres the anchor oval horizontally even when the seats are lopsided", () => {
        const oval = box(100, 100, 300, 500);
        const seats = [box(40, 80, 330, 520)];
        const fit = computeTableOnlyFit(seats, [], box(0, 0, 400, 800), { x: 0, y: 0 }, { anchor: oval, x: 200, y: 400 });
        const p = placed(oval, fit);
        expect((p.left + p.right) / 2).toBeCloseTo(200, 4);
        expect((p.top + p.bottom) / 2).toBeCloseTo(400, 4);
        const s0 = placed(seats[0], fit);
        expect(s0.left).toBeGreaterThanOrEqual(-0.01);
        expect(s0.right).toBeLessThanOrEqual(400.01);
    });

    it("works in screen space relative to the stage origin", () => {
        const fit = computeTableOnlyFit([box(0, 0, 100, 100)], [], box(60, 60, 160, 160), { x: 50, y: 50 });
        expect(fit).toEqual({ scale: 1, dx: 10, dy: 10 });
    });

    it("returns the identity for no content and leaves the base transform untouched", () => {
        expect(computeTableOnlyFit([], [], box(0, 0, 10, 10))).toBe(IDENTITY_FIT);
        expect(fitTransform(IDENTITY_FIT, "scale(0.5)")).toBe("scale(0.5)");
        expect(fitTransform({ scale: 0.9, dx: 4, dy: 8 }, "scale(0.5)")).toBe("translate(4.0px, 8.0px) scale(0.9000) scale(0.5)");
    });
});