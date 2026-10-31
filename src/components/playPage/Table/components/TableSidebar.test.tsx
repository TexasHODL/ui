
import { fireEvent, render, screen } from "@testing-library/react";
import { TableSidebar } from "./TableSidebar";
import { useTablePanels } from "../../../../hooks/game/useTablePanels";

const SidebarHarness = ({ compact = false, dockHeight = 180 }) => {
    const panels = useTablePanels(!compact);
    return <>
        <button aria-controls="table-history-panel" onClick={panels.onCloseSideBar}>History</button>
        <div data-testid="felt" />
        <TableSidebar isOpen={panels.openSidebar} expandedHistory={panels.expandedHistory} compact={compact} dockHeight={dockHeight} onOpen={panels.onCloseSideBar} onExpand={panels.expandHistory} onClose={panels.closeHistory} />
    </>;
};

jest.mock("../../../ActionsLog", () => ({
    __esModule: true,
    default: ({ summary, onExpand, onClose }: { summary: boolean; onExpand: () => void; onClose?: () => void }) => <div>
        <span>{summary ? "Latest action" : "History rows"}</span>
        <button onClick={onExpand}>Expand hand history</button>
        {onClose && <button aria-label="Close history" onClick={onClose}>Close</button>}
    </div>
}));

test("mobile has a visible launcher and an explicit close control", () => {
    const close = jest.fn();
    const open = jest.fn();
    const { rerender } = render(<TableSidebar isOpen={false} compact onOpen={open} onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Open hand history" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    rerender(<TableSidebar isOpen compact onOpen={open} onClose={close} />);
    expect(screen.getByRole("button", { name: "Close history" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(close).toHaveBeenCalledTimes(1);
});

test("mobile dismisses with Escape or a tap outside, but not an inside tap", () => {
    const close = jest.fn();
    render(<TableSidebar isOpen compact onClose={close} />);
    fireEvent.pointerDown(screen.getByText("History rows"));
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    expect(close).toHaveBeenCalledTimes(2);
});

test("PC History starts closed, opens from its button in the Settings shell, and the X leaves nothing open", () => {
    render(<SidebarHarness dockHeight={48} />);
    expect(screen.queryByText("History rows")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.queryByText("Latest action")).not.toBeInTheDocument();
    expect(screen.getByText("History rows")).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveAttribute("data-sidebar", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(screen.queryByText("History rows")).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

test("PC History closes on a click outside, stays open for clicks inside and on its own button", () => {
    render(<SidebarHarness />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.pointerDown(screen.getByText("History rows"));
    expect(screen.getByText("History rows")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId("felt"));
    expect(screen.queryByText("History rows")).not.toBeInTheDocument();
    // Re-pressing the button opens it again (its own press is not an outside click).
    fireEvent.pointerDown(screen.getByRole("button", { name: "History" }));
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("History rows")).toBeInTheDocument();
});

test("expansion resets on rotation", () => {
    const { rerender } = render(<SidebarHarness />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand hand history" }));
    rerender(<SidebarHarness compact />);
    rerender(<SidebarHarness />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

test("PC expanded History uses the Settings shell with a History title and close button", () => {
    const close = jest.fn();
    render(<TableSidebar isOpen expandedHistory onClose={close} />);
    const panel = document.getElementById("table-history-panel");
    expect(panel).toHaveAttribute("data-sidebar", "true");
    expect(panel).toHaveClass("action-log-overlay", "action-log-open", "settings-panel-width");
    expect(panel?.querySelector(".table-settings-body .settings-heading")).toHaveTextContent("History");
    expect(panel?.querySelector(".settings-content")).toHaveTextContent("History rows");
    const button = screen.getByRole("button", { name: "Close history" });
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(close).toHaveBeenCalledTimes(1);
});

test("PC History opens as the Settings-style modal, not the old corner feed", () => {
    render(<TableSidebar isOpen dockHeight={180} />);
    const panel = document.getElementById("table-history-panel");
    expect(panel).toHaveAttribute("data-sidebar", "true");
    expect(panel).toHaveClass("action-log-overlay", "action-log-open", "settings-panel-width");
    expect(panel?.querySelector(".table-settings-body .settings-heading")).toHaveTextContent("History");
});
