import { isChunkLoadError, reloadOnceForChunkError, clearChunkReload, recoverFromPreloadError } from "./lazyRoute";

describe("lazyRoute chunk recovery", () => {
    afterEach(() => {
        clearChunkReload();
    });

    it("recognises a failed dynamic import", () => {
        expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
        expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/Table.css"))).toBe(true);
        expect(isChunkLoadError(new Error("gameOptions.smallBlind is required"))).toBe(false);
    });

    it("reloads once, then leaves the error for the page boundary", () => {
        const reload = jest.fn();
        expect(reloadOnceForChunkError(reload)).toBe(true);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(reloadOnceForChunkError(reload)).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("retries a preload failure once without cancelling it", () => {
        const reload = jest.fn();
        const first = new Event("vite:preloadError", { cancelable: true });
        recoverFromPreloadError(first, reload);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(first.defaultPrevented).toBe(false);

        const second = new Event("vite:preloadError", { cancelable: true });
        recoverFromPreloadError(second, reload);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(second.defaultPrevented).toBe(false);
    });
});
