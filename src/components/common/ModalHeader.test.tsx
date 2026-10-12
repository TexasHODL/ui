import { fireEvent, render, screen } from "@testing-library/react";
import { ModalHeader } from "./ModalHeader";

it("uses the Texas HODL asset and the same heading layout for buy-in dialogs", () => {
    const { rerender } = render(<ModalHeader kicker="Take your seat" title="Cash Game Buy-In" />);
    expect(screen.getByRole("heading")).toHaveClass("hodl-modal-title");
    expect(screen.getByRole("img", { name: "Texas HODL" })).toHaveAttribute("src", "/texas-hodl-logo.png");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<ModalHeader kicker="Take your seat" title="Sit & Go Tournament" subtitle="Texas Hold’em · 4 Players" />);
    expect(screen.getByRole("heading")).toHaveClass("hodl-modal-title");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("Texas Hold’em · 4 Players")).toHaveClass("hodl-modal-subtitle");
});

it("keeps the existing dismissal handler disabled during processing", () => {
    const close = jest.fn();
    const { rerender } = render(<ModalHeader title="Confirm" onClose={close} closeDisabled />);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(close).not.toHaveBeenCalled();
    rerender(<ModalHeader title="Confirm" titleId="confirm-title" onClose={close} />);
    expect(screen.getByRole("heading")).toHaveAttribute("id", "confirm-title");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(close).toHaveBeenCalledTimes(1);
});
