import { render, screen } from "@testing-library/react";
import { FinishedSeatCards } from "./FinishedSeatCards";

beforeAll(() => {
    class StubResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;
});

describe("FinishedSeatCards", () => {
    it("shows the floored payout where the hole cards were", () => {
        render(<FinishedSeatCards place={2} payout="3360000" />);
        expect(screen.getByTestId("finished-seat-payout")).toHaveTextContent("Won $3.36");
        expect(screen.queryByRole("img")).toBeNull();
    });

    it("leaves the card area empty when the finisher won nothing", () => {
        const { container } = render(<FinishedSeatCards place={4} payout="0" />);
        expect(container.querySelector("[data-testid='finished-seat-cards']")).not.toBeNull();
        expect(screen.queryByTestId("finished-seat-payout")).toBeNull();
        expect(screen.queryByText("$0.00")).toBeNull();
        expect(screen.queryByText(/Won/)).toBeNull();
    });

    it("does not print $0.00 for a sub-cent prize", () => {
        render(<FinishedSeatCards place={5} payout="1" />);
        expect(screen.queryByTestId("finished-seat-payout")).toBeNull();
        expect(screen.queryByText("$0.00")).toBeNull();
    });
});
