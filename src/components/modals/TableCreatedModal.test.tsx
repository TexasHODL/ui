import { fireEvent, render, screen } from "@testing-library/react";
import TableCreatedModal from "./TableCreatedModal";
import { copyToClipboard } from "../../utils/clipboard";
jest.mock("../../utils/clipboard", () => ({ copyToClipboard: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test("a confirmed creation has a join link and transaction receipt", () => {
    const close = jest.fn();
    render(<TableCreatedModal receipt={{ txHash: "tx123", gameId: "table456" }} onClose={close} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(screen.getByText("table456")).toBeInTheDocument();
    expect(screen.queryByText("tx123")).not.toBeInTheDocument();
    expect(screen.queryByText("Transaction hash")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join Table" })).toHaveAttribute("href", "/table/table456");
    expect(screen.getByRole("link", { name: "View transaction" })).toHaveAttribute("href", "/explorer/tx/tx123");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(close).toHaveBeenCalledTimes(1);
});

test("a receipt without a table ID is pending, not a misleading success", () => {
    render(<TableCreatedModal receipt={{ txHash: "tx123", gameId: null }} onClose={jest.fn()} />);
    expect(screen.getByText("Creation submitted")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Join Table" })).not.toBeInTheDocument();
    expect(screen.getByText(/before trying to create another table/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy table ID" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy invite link" })).not.toBeInTheDocument();
});

test("copies the table ID or an invite on the current preview origin, never the transaction hash", () => {
    render(<TableCreatedModal receipt={{ txHash: "tx123", gameId: "table456" }} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy table ID" }));
    expect(copyToClipboard).toHaveBeenLastCalledWith("table456", "Table ID copied!");
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
    expect(copyToClipboard).toHaveBeenLastCalledWith(`${window.location.origin}/table/table456`, "Table invite link copied!");
});

test("no receipt means no dialog; Escape dismisses a receipt", () => {
    const close = jest.fn();
    const { rerender } = render(<TableCreatedModal receipt={null} onClose={close} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<TableCreatedModal receipt={{ txHash: "tx123", gameId: "table456" }} onClose={close} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
});
