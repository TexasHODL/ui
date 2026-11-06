import { render, screen } from "@testing-library/react";
import { PrizeAmount } from "./PrizeAmount";

describe("PrizeAmount", () => {
    it("shows a plain floored label for the Bubble prize", () => {
        render(<PrizeAmount micro="25200" />);
        const prize = screen.getByTestId("prize-amount");
        expect(prize.tagName).toBe("SPAN");
        expect(prize).toHaveTextContent("$0.02");
        expect(prize).not.toHaveAttribute("title");
        expect(screen.queryByRole("tooltip")).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("floors the second Bubble place to one cent", () => {
        render(<PrizeAmount micro="10800" />);
        expect(screen.getByTestId("prize-amount")).toHaveTextContent("$0.01");
    });

    it("shows a positive sub-cent prize as a plain $0.00", () => {
        render(<PrizeAmount micro="1" />);
        const prize = screen.getByTestId("prize-amount");
        expect(prize).toHaveTextContent("$0.00");
        expect(screen.queryByText("Under 1¢")).toBeNull();
    });

    it("shows an exact cent with two decimals", () => {
        render(<PrizeAmount micro="400000" />);
        expect(screen.getByTestId("prize-amount")).toHaveTextContent("$0.40");
    });

    it("shows a dash when the amount is not a whole micro-USDC value", () => {
        render(<PrizeAmount micro="0.0252" />);
        expect(screen.getByTestId("prize-amount")).toHaveTextContent("—");
    });
});
