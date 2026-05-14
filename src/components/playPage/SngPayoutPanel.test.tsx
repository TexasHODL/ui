import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SngPayoutPanel from "./SngPayoutPanel";

const mockUseSitAndGoPayouts = jest.fn();

jest.mock("../../hooks/game/useSitAndGoPayouts", () => ({
    useSitAndGoPayouts: () => mockUseSitAndGoPayouts()
}));

jest.mock("../common/Modal", () => ({
    Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null)
}));

describe("SngPayoutPanel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows payout amounts per finishing position without helper copy", () => {
        mockUseSitAndGoPayouts.mockReturnValue({
            isSitAndGo: true,
            prizePool: "400000",
            places: [
                { place: 1, payout: "280000", percentBasisPoints: 7000 },
                { place: 2, payout: "120000", percentBasisPoints: 3000 }
            ]
        });

        render(<SngPayoutPanel />);
        fireEvent.click(screen.getByTestId("sng-payouts-button"));

        expect(screen.getByText("Prize Pool")).toBeInTheDocument();
        expect(screen.getByTestId("sng-payout-place-1")).toHaveTextContent("$0.28");
        expect(screen.getByTestId("sng-payout-place-2")).toHaveTextContent("$0.12");
        expect(screen.queryByText(/Payout structure is fixed/i)).not.toBeInTheDocument();
    });
});
