import { fireEvent, render, screen } from "@testing-library/react";
import { PrizeAmount } from "./PrizeAmount";

describe("PrizeAmount", () => {
    it("shows the floored cents and the exact Bubble prize", () => {
        render(<PrizeAmount micro="25200" />);
        const prize = screen.getByTestId("prize-amount");
        expect(prize).toHaveTextContent("$0.02");
        expect(prize).toHaveAttribute("data-prize-exact", "0.0252");
        expect(prize).toHaveAttribute("title", "Exact prize $0.0252. Shown cents are rounded down.");
        expect(screen.getByRole("tooltip")).toHaveTextContent("Exact prize $0.0252");
    });

    it("opens the exact amount on tap and closes from the keyboard", () => {
        render(<PrizeAmount micro="10800" />);
        const prize = screen.getByTestId("prize-amount");
        expect(prize).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(prize);
        expect(prize).toHaveAttribute("aria-expanded", "true");
        fireEvent.keyDown(prize, { key: "Escape" });
        expect(prize).toHaveAttribute("aria-expanded", "false");
    });

    it("keeps a sub-cent prize looking payable", () => {
        render(<PrizeAmount micro="1" />);
        const prize = screen.getByTestId("prize-amount");
        expect(prize).toHaveTextContent("$0.00");
        expect(prize).toHaveTextContent("Under 1¢");
        expect(prize).toHaveAttribute("data-prize-exact", "0.000001");
        expect(prize).toBeEnabled();
    });

    it("shows an exact cent with no rounding note", () => {
        render(<PrizeAmount micro="400000" />);
        expect(screen.getByTestId("prize-amount")).toHaveAttribute(
            "title",
            "Exact prize $0.40."
        );
    });
});