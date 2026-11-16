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

describe("Escape", () => {
    it("closes an open menu, leaves a closed one alone, and ignores Escape while a dialog is on top", () => {
        const { details, outside } = mount();
        const { unmount } = renderHook(() => {
            const ref = useRef(details);
            useDismissDetailsOnOutsidePointer(ref);
        });

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(details.open).toBe(false);

        details.open = true;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(details.open).toBe(false);

        details.open = true;
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        document.body.append(dialog);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(details.open).toBe(true);
        dialog.remove();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(details.open).toBe(false);

        details.open = true;
        unmount();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(details.open).toBe(true);
        press(outside, "mouse");
        expect(details.open).toBe(true);
    });
});
