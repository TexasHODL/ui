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

test("stops above the action bar, payout structure, and hand strength", () => {
    const root = document.createElement("div");
    root.className = "table-container";
    const stage = document.createElement("div");
    const table = document.createElement("div");
    const bar = document.createElement("div");
    bar.className = "table-action-bar";
    const payout = document.createElement("div");
    payout.dataset.testid = "sng-payout-structure";
    const strength = document.createElement("div");
    strength.className = "live-hand-strength";
    root.append(stage, table, bar, payout, strength);
    document.body.append(root);
    const box = (top: number, bottom: number, left = 1200, right = 1584) => ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    stage.getBoundingClientRect = () => ({ top: 119, right: 1600, bottom: 900, left: 0, width: 1600, height: 781 }) as DOMRect;
    table.getBoundingClientRect = () => ({ top: 180, right: 1000, bottom: 700, left: 200, width: 800, height: 520 }) as DOMRect;
    bar.getBoundingClientRect = () => box(608, 768, 0, 1600);
    payout.getBoundingClientRect = () => box(540, 750);
    strength.getBoundingClientRect = () => box(500, 548);
    const { result } = renderHook(() => useHistoryDock({ current: stage }, { current: table }, 1600, 800, 0.6, false, false));
    expect((result.current as Record<string, string>)["--history-height"]).toBe("365px");
    root.remove();
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
