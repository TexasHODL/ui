import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TableSidebar } from "./TableSidebar";
import { useTablePanels } from "../../../../hooks/game/useTablePanels";

const SidebarHarness = ({ compact = false, dockHeight = 180 }) => {
    const panels = useTablePanels(!compact);
    return <TableSidebar isOpen={panels.openSidebar} expandedHistory={panels.expandedHistory} compact={compact} dockHeight={dockHeight} onOpen={panels.onCloseSideBar} onExpand={panels.expandHistory} onClose={panels.closeHistory} />;
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

test("a cramped desktop dock shows a summary and closes after expanding", () => {
    render(<SidebarHarness dockHeight={48} />);
    expect(screen.getByText("Latest action")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand hand history" }));
    expect(screen.getByText("History rows")).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveAttribute("data-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(screen.queryByText("History rows")).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

test("the desktop dock header closes the panel", () => {
    render(<SidebarHarness dockHeight={180} />);
    fireEvent.click(screen.getByRole("button", { name: "Close history" }));
    expect(screen.queryByText("History rows")).not.toBeInTheDocument();
});

test("desktop dock stays visible when clicking the table and expansion resets on rotation", () => {
    const { rerender } = render(<SidebarHarness />);
    fireEvent.pointerDown(document.body);
    expect(screen.getByText("History rows")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand hand history" }));
    rerender(<SidebarHarness compact />);
    rerender(<SidebarHarness />);
    expect(screen.getByRole("region")).toHaveAttribute("data-expanded", "false");
});
