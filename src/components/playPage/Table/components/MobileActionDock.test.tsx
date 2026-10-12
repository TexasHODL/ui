import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { MobileActionDock } from "./MobileActionDock";

let resize: () => void;
let contentHeight = 0;
const originalObserver = global.ResizeObserver;
beforeEach(() => {
    contentHeight = 0;
    global.ResizeObserver = class { constructor(cb: ResizeObserverCallback) { resize = () => cb([], this); } observe() {} unobserve() {} disconnect() {} };
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ height: contentHeight } as DOMRect));
});
afterEach(() => { jest.restoreAllMocks(); global.ResizeObserver = originalObserver; });

it("reserves portrait action space before a turn and retains the largest observed height", () => {
    const { rerender } = render(<MobileActionDock portrait><div>Idle</div></MobileActionDock>);
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "160px" });
    contentHeight = 190;
    act(() => resize());
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "202px" });
    contentHeight = 28;
    rerender(<MobileActionDock portrait><div>Next turn</div></MobileActionDock>);
    act(() => resize());
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "202px" });
});

it("re-measures for landscape without remounting the action hooks", () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Actions() { useEffect(() => { mounted(); return unmounted; }, []); return <div>Actions</div>; }
    const { rerender } = render(<MobileActionDock portrait><Actions /></MobileActionDock>);
    rerender(<MobileActionDock portrait={false}><Actions /></MobileActionDock>);
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "96px" });
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
});

it("includes measured safe-area / wrapped content and releases the peak after viewport resize", () => {
    render(<MobileActionDock portrait={false}><div>Controls</div></MobileActionDock>);
    contentHeight = 140;
    act(() => resize());
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "152px" });
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width + 100 });
    contentHeight = 60;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(screen.getByTestId("mobile-action-slot")).toHaveStyle({ minHeight: "96px" });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
});
