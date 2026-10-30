import { DESKTOP_ACTION_BAR_VAR, HAND_STRENGTH_DESKTOP_BOTTOM, observeDesktopActionBar } from "./desktopActionBar";

describe("desktop action bar measurement", () => {
    let callback: (() => void) | null = null;
    const disconnect = jest.fn();

    beforeEach(() => {
        callback = null;
        disconnect.mockReset();
        (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
            constructor(cb: () => void) {
                callback = cb;
            }
            observe() {}
            disconnect() {
                disconnect();
            }
        };
    });

    const setup = (height: number) => {
        const root = document.createElement("div");
        root.className = "table-container";
        const bar = document.createElement("div");
        root.appendChild(bar);
        let h = height;
        bar.getBoundingClientRect = () => ({ height: h }) as DOMRect;
        return { root, bar, resize: (next: number) => (h = next) };
    };

    it("publishes the banner height and follows it when the dock content changes", () => {
        const { root, bar, resize } = setup(64.5);
        const stop = observeDesktopActionBar(bar);
        expect(root.style.getPropertyValue(DESKTOP_ACTION_BAR_VAR)).toBe("64.5px");
        resize(118);
        callback?.();
        expect(root.style.getPropertyValue(DESKTOP_ACTION_BAR_VAR)).toBe("118px");
        stop();
        expect(disconnect).toHaveBeenCalled();
        expect(root.style.getPropertyValue(DESKTOP_ACTION_BAR_VAR)).toBe("");
    });

    it("puts the hand-strength badge exactly 3px above the banner", () => {
        expect(HAND_STRENGTH_DESKTOP_BOTTOM).toBe("calc(var(--desktop-action-bar-h, 165px) + 3px)");
    });
});