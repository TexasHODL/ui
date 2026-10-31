import { act, renderHook } from "@testing-library/react";
import { useTablePanels } from "./useTablePanels";

const shownOf = (r: { current: ReturnType<typeof useTablePanels> }) => [r.current.openSidebar, r.current.openSettings, r.current.blindsOpen];

/** Mount panel/toggle/table nodes the outside-click logic recognises. */
const mountDom = () => {
    document.body.innerHTML = `
        <button aria-controls="table-history-panel">History</button>
        <button aria-controls="table-settings-panel">Settings</button>
        <div id="table-settings-panel"><div class="scroll"><span id="inside">row</span></div></div>
        <div id="table-history-panel"><span id="inside-history">row</span></div>
        <div id="felt"></div>
        <button id="fold">Fold</button>`;
    return (id: string) => document.getElementById(id)!;
};
const pointer = (el: Element) => el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

describe("table panel selection", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    it("PC starts with nothing open; History opens only from its button", () => {
        const { result } = renderHook(() => useTablePanels(true));
        expect(shownOf(result)).toEqual([false, false, false]);
        act(() => result.current.onCloseSideBar());
        expect(shownOf(result)).toEqual([true, false, false]);
        act(() => result.current.onCloseSideBar());
        expect(shownOf(result)).toEqual([false, false, false]);
    });

    it("clears a selection when the layout switches", () => {
        const { result, rerender } = renderHook(({ persistent }) => useTablePanels(persistent), { initialProps: { persistent: true } });
        act(() => result.current.onCloseSideBar());
        rerender({ persistent: false });
        expect(result.current.openSidebar).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        act(() => result.current.closeHistory());
        expect(result.current.openSidebar).toBe(false);
    });

    it("keeps History, Settings and Blinds mutually exclusive on PC: opening one closes the other", () => {
        const { result } = renderHook(() => useTablePanels(true));
        act(() => result.current.onToggleSettings());
        act(() => result.current.onCloseSideBar()); // History while Settings is open
        expect(shownOf(result)).toEqual([true, false, false]);
        act(() => result.current.onToggleSettings()); // Settings while History is open
        expect(shownOf(result)).toEqual([false, true, false]);
        act(() => result.current.openBlinds());
        expect(shownOf(result)).toEqual([false, false, true]);
        act(() => result.current.onCloseSideBar());
        expect(shownOf(result)).toEqual([true, false, false]);
        act(() => result.current.openBlinds());
        act(() => result.current.closeHistory()); // a stray History close leaves Blinds alone
        expect(shownOf(result)).toEqual([false, false, true]);
    });

    it("closing any panel leaves nothing open (History never comes back)", () => {
        const { result } = renderHook(() => useTablePanels(true));
        act(() => result.current.onCloseSideBar());
        act(() => result.current.onToggleSettings());
        act(() => result.current.onToggleSettings()); // close Settings
        expect(shownOf(result)).toEqual([false, false, false]);
        act(() => result.current.onCloseSideBar());
        act(() => result.current.openBlinds());
        act(() => result.current.closeBlinds());
        expect(shownOf(result)).toEqual([false, false, false]);
        act(() => result.current.onCloseSideBar());
        act(() => result.current.closeHistory()); // History X
        expect(shownOf(result)).toEqual([false, false, false]);
    });

    it("mobile starts closed and swaps history/settings exclusively", () => {
        const { result } = renderHook(() => useTablePanels());
        expect(shownOf(result)).toEqual([false, false, false]);
        act(() => result.current.onCloseSideBar());
        act(() => result.current.onToggleSettings());
        expect(shownOf(result)).toEqual([false, true, false]);
        act(() => result.current.onCloseSideBar());
        expect(shownOf(result)).toEqual([true, false, false]);
        act(() => result.current.onCloseSideBar());
        expect(shownOf(result)).toEqual([false, false, false]);
    });

    it("handles rapid switches without ever selecting both panels", () => {
        const { result } = renderHook(() => useTablePanels());
        act(() => {
            result.current.onCloseSideBar();
            result.current.onToggleSettings();
            result.current.onCloseSideBar();
        });
        expect(shownOf(result)).toEqual([true, false, false]);
    });

    describe("PC outside click", () => {
        it("closes Settings, History and Blinds on a click outside, but not inside or on the toggles", () => {
            const $ = mountDom();
            const { result } = renderHook(() => useTablePanels(true));
            act(() => result.current.onToggleSettings());
            act(() => pointer($("inside")));
            expect(result.current.openSettings).toBe(true);
            act(() => pointer(document.querySelector("[aria-controls=\"table-settings-panel\"]")!));
            expect(result.current.openSettings).toBe(true); // the toggle's own onClick decides
            act(() => pointer($("felt")));
            expect(shownOf(result)).toEqual([false, false, false]);

            act(() => result.current.onCloseSideBar());
            act(() => pointer($("inside-history")));
            expect(result.current.openSidebar).toBe(true);
            act(() => pointer($("felt")));
            expect(shownOf(result)).toEqual([false, false, false]);

            act(() => result.current.openBlinds());
            act(() => pointer($("felt")));
            expect(shownOf(result)).toEqual([false, false, false]);
        });

        it("lets a click through on the felt but swallows it on a table control", () => {
            const $ = mountDom();
            const onFelt = jest.fn();
            const onFold = jest.fn();
            $("felt").addEventListener("click", onFelt);
            $("fold").addEventListener("click", onFold);
            const { result } = renderHook(() => useTablePanels(true));
            act(() => result.current.onToggleSettings());
            act(() => { pointer($("felt")); $("felt").click(); });
            expect(onFelt).toHaveBeenCalledTimes(1);
            act(() => result.current.onToggleSettings());
            act(() => { pointer($("fold")); $("fold").click(); });
            expect(onFold).not.toHaveBeenCalled();
            expect(result.current.openSettings).toBe(false);
            $("fold").click(); // the next, deliberate click works
            expect(onFold).toHaveBeenCalledTimes(1);
        });

        it("does nothing on mobile (its panels manage their own dismissal)", () => {
            const $ = mountDom();
            const { result } = renderHook(() => useTablePanels(false));
            act(() => result.current.onToggleSettings());
            act(() => pointer($("felt")));
            expect(result.current.openSettings).toBe(true);
        });
    });
});