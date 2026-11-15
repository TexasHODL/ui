import { fireEvent, render, screen } from "@testing-library/react";
import { MobileDrawerShell } from "./MobileDrawerShell";

const renderShell = () => {
    const onClose = jest.fn();
    const view = render(
        <MobileDrawerShell title="Settings" closeLabel="Close settings" onClose={onClose} testId="test-drawer">
            <button type="button">Copy Table Link</button>
            <p>Row text</p>
        </MobileDrawerShell>
    );
    return { onClose, ...view };
};

describe("MobileDrawerShell", () => {
    it("closes on a tap on the backdrop (anywhere outside the panel)", () => {
        const { onClose } = renderShell();
        fireEvent.click(screen.getByTestId("test-drawer-backdrop"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays open on a tap inside the panel: heading, rows or body", () => {
        const { onClose } = renderShell();
        const panel = screen.getByTestId("test-drawer");
        fireEvent.click(panel);
        fireEvent.click(screen.getByText("Settings"));
        fireEvent.click(screen.getByText("Copy Table Link"));
        fireEvent.click(screen.getByText("Row text"));
        fireEvent.click(panel.querySelector(".mobile-drawer-content") as Element);
        expect(onClose).not.toHaveBeenCalled();
    });

    it("keeps the backdrop outside the panel, so panel taps never reach it", () => {
        renderShell();
        expect(screen.getByTestId("test-drawer")).not.toContainElement(screen.getByTestId("test-drawer-backdrop"));
    });

    it("closes from the X and on Esc, and other keys do nothing", () => {
        const { onClose, unmount } = renderShell();
        fireEvent.click(screen.getByLabelText("Close settings"));
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(window, { key: "Enter" });
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
        unmount();
        fireEvent.keyDown(window, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("scrolls its body, not the page: the content is the scroll area", () => {
        renderShell();
        const panel = screen.getByTestId("test-drawer");
        expect(panel).toHaveClass("mobile-drawer");
        expect(panel.querySelector(".mobile-drawer-content")).toContainElement(screen.getByText("Copy Table Link"));
    });
});