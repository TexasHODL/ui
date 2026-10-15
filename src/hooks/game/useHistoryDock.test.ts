import { renderHook } from "@testing-library/react";
import { useHistoryDock } from "./useHistoryDock";

const rect = (top: number, right: number) => ({ top, right }) as DOMRect;
test("uses a compact top gap when the table leaves no side space", () => {
    const stage = document.createElement("div");
    const table = document.createElement("div");
    stage.getBoundingClientRect = () => rect(119, 900);
    table.getBoundingClientRect = () => rect(218, 788);
    const { result } = renderHook(() => useHistoryDock({ current: stage }, { current: table }, 900, 681, 0.676, false, false));
    expect(result.current).toEqual({ "--history-top": "127px", "--history-height": "62px" });
    expect(stage.style.marginRight).toBe("");
    expect(table.style.transform).toBe("");
});

test("allows a taller log in genuine spare side space", () => {
    const stage = document.createElement("div");
    const table = document.createElement("div");
    stage.getBoundingClientRect = () => rect(119, 1600);
    table.getBoundingClientRect = () => rect(180, 1000);
    const { result } = renderHook(() => useHistoryDock({ current: stage }, { current: table }, 1600, 800, 0.6, false, false));
    expect(parseFloat((result.current as Record<string, string>)["--history-height"])).toBe(Math.floor(Math.min(window.innerHeight, 919) - 127 - 16));
    expect(parseFloat((result.current as Record<string, string>)["--history-height"])).toBeGreaterThan(220);
});

test("bounds the side log to the stage when it ends above the viewport bottom", () => {
    const stage = document.createElement("div");
    const table = document.createElement("div");
    stage.getBoundingClientRect = () => rect(119, 1600);
    table.getBoundingClientRect = () => rect(180, 1000);
    const { result } = renderHook(() => useHistoryDock({ current: stage }, { current: table }, 1600, 400, 0.6, false, false));
    expect((result.current as Record<string, string>)["--history-height"]).toBe("376px");
});

test("leaves compact mobile sizing unchanged", () => {
    const { result } = renderHook(() => useHistoryDock({ current: document.createElement("div") }, { current: document.createElement("div") }, 393, 600, 0.6, false, true));
    expect(result.current).toEqual({});
});

test("stops before a seat even when the felt itself leaves enough room", () => {
    const stage = document.createElement("div");
    const table = document.createElement("div");
    const seat = document.createElement("div");
    seat.className = "vacant-seat";
    stage.appendChild(seat);
    stage.getBoundingClientRect = () => rect(119, 1600);
    table.getBoundingClientRect = () => rect(180, 1000);
    seat.getBoundingClientRect = () => ({ top: 215, right: 1460, bottom: 280 }) as DOMRect;
    const { result } = renderHook(() => useHistoryDock({ current: stage }, { current: table }, 1600, 800, 0.6, false, false));
    expect((result.current as Record<string, string>)["--history-height"]).toBe("56px");
});
