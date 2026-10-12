import { fireEvent, render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
    it("marks the current page and changes page without a form submission", () => {
        const change = jest.fn();
        render(<Pagination currentPage={1} totalItems={28} pageSize={10} onPageChange={change} />);
        expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByText("Showing 1–10 of 28")).toBeInTheDocument();
        screen.getAllByRole("button", { name: "‹ Prev" }).forEach(button => expect(button).toBeDisabled());
        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
        expect(change).toHaveBeenCalledWith(2);
    });

    it("disables next on the last page and hides a single page", () => {
        const props = { currentPage: 3, totalItems: 28, pageSize: 10, onPageChange: jest.fn() };
        const { rerender } = render(<Pagination {...props} />);
        screen.getAllByRole("button", { name: "Next ›" }).forEach(button => expect(button).toBeDisabled());
        expect(screen.getByText("Showing 21–28 of 28")).toBeInTheDocument();
        rerender(<Pagination {...props} currentPage={1} totalItems={4} />);
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
});
