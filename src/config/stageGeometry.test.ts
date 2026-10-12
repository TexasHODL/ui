import { calculateZoom, VIEWPORT_PARAMS, getSeatPositions, getViewportMode, getTableTransform, getContentBounds, type TableSize } from "./stageGeometry";

describe("getViewportMode", () => {
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

    it("moves the desktop table left without changing scale or vertical position", () => {
        setViewport(1280, 800, false);
        const normal = getTableTransform(0.6, 9, 1280, 680);
        const shifted = getTableTransform(0.6, 9, 1280, 680, -48);
        expect(parseFloat(shifted.slice(10))).toBeCloseTo(parseFloat(normal.slice(10)) - 48, 1);
        expect(shifted.split(",")[1]).toBe(normal.split(",")[1]);
    });

    it("limits the left offset to the spare space so seats remain on screen", () => {
        setViewport(900, 800, false);
        const width = getContentBounds(9).width * 0.6 + 30;
        const normal = getTableTransform(0.6, 9, width, 680);
        const shifted = getTableTransform(0.6, 9, width, 680, -48);
        expect(parseFloat(normal.slice(10)) - parseFloat(shifted.slice(10))).toBeCloseTo(3, 1);
    });

    it("returns mobile-landscape for standard mobile landscape widths", () => {
        setViewport(900, 430, true);
        expect(getViewportMode()).toBe("mobile-landscape");
    });

    it("returns mobile-landscape for compact touch landscape fold-like viewports", () => {
        setViewport(1400, 800, true);
        expect(getViewportMode()).toBe("mobile-landscape");
    });

    it("keeps desktop for compact landscape viewports on non-touch pointers", () => {
        setViewport(1400, 800, false);
        expect(getViewportMode()).toBe("desktop");
    });

    it("returns mobile-landscape for short landscape windows even without a coarse pointer", () => {
        // An iPhone 15 in landscape is 852px WIDE — any width-based breakpoint
        // calls it desktop. Height is what's scarce: sub-500px-tall landscape
        // gets the compact treatment regardless of pointer type.
        setViewport(852, 443, false);
        expect(getViewportMode()).toBe("mobile-landscape");
    });

    it("returns mobile-landscape for real landscape phone dimensions", () => {
        setViewport(852, 393, true);
        expect(getViewportMode()).toBe("mobile-landscape");
    });

    it("returns mobile-portrait for portrait touch devices", () => {
        setViewport(393, 852, true);
        expect(getViewportMode()).toBe("mobile-portrait");
    });

    it("returns mobile-portrait for narrow portrait windows even without a coarse pointer", () => {
        // Fine-pointer environments (narrow desktop windows, viewport-resized
        // automation) must take the same path as a real phone, not "tablet".
        setViewport(393, 852, false);
        expect(getViewportMode()).toBe("mobile-portrait");
    });

    it("keeps tablet for wide portrait windows on non-touch pointers", () => {
        setViewport(900, 1100, false);
        expect(getViewportMode()).toBe("tablet");
    });

    describe("portrait stage geometry", () => {
        const px = (value: string): number => parseFloat(value);
        const sizes: TableSize[] = [2, 4, 6, 9];

        it("lays every table size out as a vertical ring (taller than wide), hero at the bottom", () => {
            setViewport(393, 852, true);
            for (const size of sizes) {
                const seats = getSeatPositions(size);
                const xs = seats.map(p => px(p.left));
                const ys = seats.map(p => px(p.top));
                const width = Math.max(...xs) - Math.min(...xs);
                const height = Math.max(...ys) - Math.min(...ys);
                expect(height).toBeGreaterThan(width);
                // Seat 1 (the hero) is the bottom-most seat.
                expect(ys[0]).toBe(Math.max(...ys));
            }
        });

        it("lays the same sizes out as a horizontal ring in landscape", () => {
            setViewport(900, 430, true);
            // 2-max is excluded: heads-up seats are stacked vertically (hero
            // bottom, villain top) in BOTH orientations, so it has no width.
            for (const size of sizes.filter(s => s !== 2)) {
                const seats = getSeatPositions(size);
                const xs = seats.map(p => px(p.left));
                const ys = seats.map(p => px(p.top));
                expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys));
            }
        });
    });

    it.each([
        [390, 780, 72, 160], [360, 640, 72, 202], [966, 1100, 72, 180],
        [844, 390, 72, 96], [667, 320, 72, 120], [1280, 740, 72, 96]
    ])("fits every seat above the mobile action slot at %dx%d", (width, height, header, dock) => {
        setViewport(width, height, true);
        const stageHeight = height - header - dock;
        expect(VIEWPORT_PARAMS[getViewportMode()].footerOverlay).toBe(0);
        for (const size of [2, 4, 6, 9] as TableSize[]) {
            const bounds = getContentBounds(size);
            const scale = calculateZoom(size, width, stageHeight);
            const transform = getTableTransform(scale, size, width, stageHeight);
            const y = Number(transform.match(/translate\([^,]+, ([^)]+)px\)/)?.[1]);
            const bottom = y + (bounds.centerY + bounds.height / 2) * scale;
            const top = y + (bounds.centerY - bounds.height / 2) * scale;
            expect(top).toBeGreaterThanOrEqual(0);
            expect(bottom).toBeLessThanOrEqual(stageHeight);
        }
    });
});
