
import { render, screen } from "@testing-library/react";
import SngPayoutPanel from "./SngPayoutPanel";

const mockUseSitAndGoPayouts = jest.fn();

jest.mock("../../hooks/game/useSitAndGoPayouts", () => ({
    useSitAndGoPayouts: () => mockUseSitAndGoPayouts()
}));

describe("SngPayoutPanel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows inline payout structure with percentages and amounts", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: true,
            prizePool: "100000000",
            places: [
                { place: 1, percent: 60, payout: "60000000" },
                { place: 2, percent: 40, payout: "40000000" }
            ]
        });

        render(<SngPayoutPanel />);

        expect(screen.getByTestId("sng-payout-structure")).toBeInTheDocument();
        expect(screen.getByText("Payout Structure")).toBeInTheDocument();
        expect(screen.queryByText("Prize Pool: $100.00")).not.toBeInTheDocument();
        expect(screen.getByTestId("sng-payout-pool")).toHaveTextContent("Prize pool");
        expect(screen.getByTestId("sng-payout-pool")).toHaveTextContent("$100.00");
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("1st 60%: $60.00");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("2nd 40%: $40.00");
    });

    it("floors the Bitcoin Bubble prizes so the labels do not exceed the pool", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: true,
            prizePool: "36000",
            places: [
                { place: 1, payout: "25200" },
                { place: 2, payout: "10800" }
            ]
        });

        render(<SngPayoutPanel />);

        expect(screen.getByTestId("sng-payout-pool")).toHaveTextContent("$0.03");
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("1st 70%:");
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("$0.02");
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("Exact prize $0.0252");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("$0.01");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("Exact prize $0.0108");
        expect(screen.getByText("Cents are rounded down. Hover, focus, or tap an amount for the exact prize.")).toBeInTheDocument();
    });

    it("renders nothing when not sit and go", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: false,
            prizePool: null,
            places: []
        });

        const { container } = render(<SngPayoutPanel />);
        expect(container.firstChild).toBeNull();
    });
});
