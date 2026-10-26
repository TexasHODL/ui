import {
    chipRect,
    dealerRect,
    getAllPositions,
    getAvatarSide,
    getBoardRect,
    getStageDims,
    getViewportMode,
    podRect,
    rectsOverlap,
    type TableSize,
    type ViewportMode
} from "./stageGeometry";

// ui#835: the dealer button is a felt token in front of the button player,
// on the seat->centre line, and must never sit on any pod or on that seat's bet.

const originalMatchMedia = window.matchMedia;

const setViewport = (width: number, height: number, coarsePointer: boolean) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: coarse)" ? coarsePointer : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    }));
};

afterEach(() => {
    window.matchMedia = originalMatchMedia;
});

const VIEWPORTS: Array<[ViewportMode, number, number, boolean]> = [
    ["desktop", 1600, 900, false],
    ["mobile-portrait", 390, 844, true],
    ["mobile-landscape", 844, 390, true]
];
const SIZES: TableSize[] = [6, 9];

const px = (v: string) => parseFloat(v);

describe.each(VIEWPORTS)("dealer button placement (%s)", (mode, w, h, coarse) => {
    beforeEach(() => setViewport(w, h, coarse));

    it("resolves the expected viewport mode", () => {
        expect(getViewportMode()).toBe(mode);
    });

    describe.each(SIZES)("%i-max", size => {
        it("never overlaps any seat pod", () => {
            const { players, dealers } = getAllPositions(size);
            dealers.forEach((d, i) => {
                players.forEach((p, j) => {
                    expect({ dealer: i, pod: j, overlap: rectsOverlap(dealerRect(d), podRect(p)) }).toEqual({ dealer: i, pod: j, overlap: false });
                });
            });
        });

        it("never overlaps the button player's own bet chip", () => {
            const { chips, dealers } = getAllPositions(size);
            dealers.forEach((d, i) => {
                expect({ seat: i, overlap: rectsOverlap(dealerRect(d), chipRect(chips[i])) }).toEqual({ seat: i, overlap: false });
            });
        });

        it("stays off the community cards / pot label", () => {
            const board = getBoardRect();
            getAllPositions(size).dealers.forEach((d, i) => {
                expect({ seat: i, overlap: rectsOverlap(dealerRect(d), board) }).toEqual({ seat: i, overlap: false });
            });
        });

        it("sits between the seat and the table centre (toward the pot)", () => {
            const dims = getStageDims();
            const cx = dims.centerX - dims.originX;
            const cy = dims.centerY - dims.originY;
            const { players, dealers } = getAllPositions(size);
            dealers.forEach((d, i) => {
                const sx = px(players[i].left);
                const sy = px(players[i].top);
                const seatToCentre = Math.hypot(cx - sx, cy - sy);
                const dealerToCentre = Math.hypot(cx - px(d.left), cy - px(d.top));
                expect(dealerToCentre).toBeLessThan(seatToCentre);
                // Moving from seat to dealer goes toward the centre, not sideways/away.
                const dot = (px(d.left) - sx) * (cx - sx) + (px(d.top) - sy) * (cy - sy);
                expect(dot).toBeGreaterThan(0);
            });
        });

        it("stays on the felt", () => {
            const dims = getStageDims();
            getAllPositions(size).dealers.forEach(d => {
                expect(px(d.left)).toBeGreaterThan(0);
                expect(px(d.left)).toBeLessThan(dims.tableWidth);
                expect(px(d.top)).toBeGreaterThan(0);
                expect(px(d.top)).toBeLessThan(dims.tableHeight);
            });
        });
    });
});

describe("getAvatarSide (ui#835: avatar on the outer side of the pod)", () => {
    beforeEach(() => setViewport(1600, 900, false));

    it("puts the avatar on the left for seats left of centre and on the right otherwise", () => {
        const { players } = getAllPositions(9);
        const half = getStageDims().tableWidth / 2;
        players.forEach(p => {
            expect(getAvatarSide(p.left)).toBe(px(p.left) < half - 1 ? "left" : "right");
        });
        // hero (seat index 0) is centre-bottom -> right; a left-side seat -> left
        expect(getAvatarSide(players[0].left)).toBe("right");
        expect(players.some(p => getAvatarSide(p.left) === "left")).toBe(true);
    });

    it("falls back to right for missing positions", () => {
        expect(getAvatarSide(undefined)).toBe("right");
    });
});
