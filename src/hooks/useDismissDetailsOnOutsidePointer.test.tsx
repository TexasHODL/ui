import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useDismissDetailsOnOutsidePointer } from "./useDismissDetailsOnOutsidePointer";

/** jsdom has no PointerEvent; a bubbling pointerdown is what mouse and touch both produce. */
const press = (el: EventTarget, pointerType: string) => {
    const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "pointerType", { value: pointerType });
    el.dispatchEvent(event);
};

const mount = () => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const button = document.createElement("button");
    button.textContent = "Light";
    const outside = document.createElement("a");
    outside.textContent = "Lobby";
    details.append(summary, button);
    document.body.append(details, outside);
    return { details, summary, button, outside };
};

afterEach(() => {
    document.body.replaceChildren();
});

describe.each(["mouse", "touch"])("a %s press", pointerType => {
    it("closes an open menu when it lands outside, and not when it lands on the summary or a control", () => {
        const { details, summary, button, outside } = mount();
        const { unmount } = renderHook(() => {
            const ref = useRef(details);
            useDismissDetailsOnOutsidePointer(ref);
        });

        details.open = true;
        press(button, pointerType);
        expect(details.open).toBe(true);
        press(summary, pointerType);
        expect(details.open).toBe(true);
        press(outside, pointerType);
        expect(details.open).toBe(false);

        details.open = true;
        unmount();
        press(outside, pointerType);
        expect(details.open).toBe(true);
    });
});
