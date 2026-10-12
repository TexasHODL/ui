import { fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";
jest.mock("../../utils/colorConfig", () => ({ colors: { brand: { primary: "#be87e5" } }, getHexagonStroke: () => "#be87e5" }));

it("applies the shared dialog shell without decorative backgrounds", () => {
    render(<Modal isOpen onClose={jest.fn()} title="Review">Details</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Review" });
    expect(dialog).toHaveClass("hodl-modal");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.querySelector("svg")).toBeNull();
    expect(screen.getAllByRole("img", { name: "Texas HODL" })).toHaveLength(1);
});

it("preserves Escape dismissal and protects a processing transaction", () => {
    const close = jest.fn();
    const { rerender } = render(<Modal isOpen onClose={close} title="Confirm" isProcessing>Details</Modal>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    rerender(<Modal isOpen onClose={close} title="Confirm">Details</Modal>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
});

it("respects explicitly non-dismissible dialogs and closed state", () => {
    const close = jest.fn();
    const { rerender } = render(<Modal isOpen onClose={close} ariaLabel="Waiting" closeOnEscape={false}>Details</Modal>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    rerender(<Modal isOpen={false} onClose={close}>Details</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
