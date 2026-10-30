import { act, renderHook } from "@testing-library/react";
import { useTablePanels } from "./useTablePanels";

describe("table panel selection", () => {
    it("clears a desktop selection when switching to portrait and supports explicit dismissal", () => {
        const { result, rerender } = renderHook(({ persistent }) => useTablePanels(persistent), { initialProps: { persistent: true } });
        act(() => result.current.onCloseSideBar());
        rerender({ persistent: false });
        expect(result.current.openSidebar).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        act(() => result.current.closeHistory());
        expect(result.current.openSidebar).toBe(false);
        act(() => result.current.closeHistory());
        expect(result.current.openSidebar).toBe(false);
    });
    it("closes the desktop dock from the history toggle and from the panel close control", () => {
        const { result } = renderHook(() => useTablePanels(true));
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.expandedHistory).toBe(false);
        act(() => result.current.closeHistory());
        expect(result.current.openSidebar).toBe(false);
        expect(result.current.expandedHistory).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.expandedHistory).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(false);
    });
    it("restores the desktop dock after closing settings", () => {
        const { result } = renderHook(() => useTablePanels(true));
        act(() => result.current.onToggleSettings());
        expect(result.current.openSettings).toBe(true);
        expect(result.current.openSidebar).toBe(false);
        act(() => result.current.onToggleSettings());
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.expandedHistory).toBe(false);
        expect(result.current.openSettings).toBe(false);
    });
    it("starts closed, swaps history/settings exclusively, and lets the selected button close the panel", () => {
        const { result } = renderHook(() => useTablePanels());
        expect(result.current.openSidebar).toBe(false);
        expect(result.current.openSettings).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.openSettings).toBe(false);
        act(() => result.current.onToggleSettings());
        expect(result.current.openSidebar).toBe(false);
        expect(result.current.openSettings).toBe(true);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.openSettings).toBe(false);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(false);
        act(() => result.current.onToggleSettings());
        act(() => result.current.onToggleSettings());
        expect(result.current.openSettings).toBe(false);
    });

    it("handles rapid switches without ever selecting both panels", () => {
        const { result } = renderHook(() => useTablePanels());
        act(() => {
            result.current.onCloseSideBar();
            result.current.onToggleSettings();
            result.current.onCloseSideBar();
        });
        expect(result.current.openSidebar).toBe(true);
        expect(result.current.openSettings).toBe(false);
    });
    it("keeps History, Settings and Blinds mutually exclusive on PC", () => {
        const { result } = renderHook(() => useTablePanels(true));
        const shown = () => [result.current.openSidebar, result.current.openSettings, result.current.blindsOpen];
        act(() => result.current.openBlinds());
        expect(shown()).toEqual([false, false, true]);
        act(() => result.current.onCloseSideBar()); // History while Blinds is open
        expect(shown()).toEqual([true, false, false]);
        act(() => result.current.onToggleSettings()); // Settings while History is open
        expect(shown()).toEqual([false, true, false]);
        act(() => result.current.openBlinds()); // Blinds from the Settings row
        expect(shown()).toEqual([false, false, true]);
        act(() => result.current.onToggleSettings()); // Settings while Blinds is open
        expect(shown()).toEqual([false, true, false]);
        act(() => result.current.openBlinds());
        act(() => result.current.expandHistory()); // expanding History closes Blinds
        expect(shown()).toEqual([true, false, false]);
        act(() => result.current.openBlinds());
        act(() => result.current.closeHistory()); // a stray History close leaves Blinds alone
        expect(shown()).toEqual([false, false, true]);
        act(() => result.current.closeBlinds()); // the feed was hidden before, so nothing reopens
        expect(shown()).toEqual([false, false, false]);
    });
    it("closing Settings or Blinds never opens History; only a feed that was already showing returns", () => {
        const { result } = renderHook(() => useTablePanels(true));
        const shown = () => [result.current.openSidebar, result.current.expandedHistory, result.current.openSettings, result.current.blindsOpen];
        // Default PC dock showing -> Settings -> close: the small feed comes back, not expanded.
        act(() => result.current.onToggleSettings());
        act(() => result.current.onToggleSettings());
        expect(shown()).toEqual([true, false, false, false]);
        // Feed hidden -> Settings -> close: History stays closed.
        act(() => result.current.closeHistory());
        act(() => result.current.onToggleSettings());
        act(() => result.current.onToggleSettings());
        expect(shown()).toEqual([false, false, false, false]);
        // Feed hidden -> Settings -> Blinds -> close Blinds: still closed.
        act(() => result.current.onToggleSettings());
        act(() => result.current.openBlinds());
        act(() => result.current.closeBlinds());
        expect(shown()).toEqual([false, false, false, false]);
        // Expanded History -> Settings -> close: does not re-expand or reopen.
        act(() => result.current.expandHistory());
        act(() => result.current.onToggleSettings());
        act(() => result.current.onToggleSettings());
        expect(shown()).toEqual([false, false, false, false]);
    });});
