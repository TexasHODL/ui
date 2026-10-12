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
    it("keeps desktop history visible and restores it after closing settings", () => {
        const { result } = renderHook(() => useTablePanels(true));
        expect(result.current.openSidebar).toBe(true);
        act(() => result.current.onCloseSideBar());
        expect(result.current.openSidebar).toBe(true);
        act(() => result.current.onToggleSettings());
        expect(result.current.openSettings).toBe(true);
        act(() => result.current.onToggleSettings());
        expect(result.current.openSidebar).toBe(true);
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
});
