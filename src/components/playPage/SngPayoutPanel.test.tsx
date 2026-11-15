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
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("$0.01");
        expect(screen.queryByText(/rounded down/i)).toBeNull();
        expect(screen.queryByText(/Exact prize/)).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();
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

    it("shows the tournament prize pool and chain schedule when the table has no payouts", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: false,
            prizePool: null,
            places: []
        });

        render(
            <SngPayoutPanel
                tournament={{
                    tournamentId: "0x275a",
                    status: "finished",
                    options: {
                        buyIn: "2000000",
                        startingStack: "5000",
                        seatsPerTable: 9,
                        minEntrants: 6,
                        maxEntrants: 27,
                        startTime: 1,
                        blindStructure: { preset: "turbo" },
                        actionTimeoutSeconds: 25
                    },
                    entrants: [],
                    tables: [],
                    level: 11,
                    prizePool: "11200000",
                    payouts: [
                        { place: 1, amount: "5600000" },
                        { place: 2, amount: "3360000" },
                        { place: 3, amount: "2240000" }
                    ],
                    results: [],
                    seq: 82
                }}
            />
        );

        expect(screen.getByTestId("sng-payout-pool")).toHaveTextContent("$11.20");
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("1st 50%: $5.60");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("2nd 30%: $3.36");
        expect(screen.getByTestId("sng-payout-place-3")).toHaveTextContent("3rd 20%: $2.24");
    });

    it("prices a percentage-only tournament schedule from the prize pool", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: true,
            prizePool: null,
            places: []
        });

        render(
            <SngPayoutPanel
                tournament={{
                    tournamentId: "0x275a",
                    status: "running",
                    options: {
                        buyIn: "2000000",
                        startingStack: "5000",
                        seatsPerTable: 9,
                        minEntrants: 6,
                        maxEntrants: 27,
                        startTime: 1,
                        blindStructure: { preset: "turbo" },
                        actionTimeoutSeconds: 25
                    },
                    entrants: [],
                    tables: [],
                    level: 1,
                    prizePool: "11200000",
                    payouts: [
                        { place: 1, percent: 50 },
                        { place: 2, percent: 30 },
                        { place: 3, percent: 20 }
                    ] as never,
                    results: [],
                    seq: 1
                }}
            />
        );

        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("1st 50%: $5.60");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("2nd 30%: $3.36");
        expect(screen.getByTestId("sng-payout-place-3")).toHaveTextContent("3rd 20%: $2.24");
    });
});
