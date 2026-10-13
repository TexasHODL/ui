import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GameWalletActions from "./GameWalletActions";

const sendTokens = jest.fn();

jest.mock("./modals/WithdrawalModal", () => ({
    __esModule: true,
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Withdraw Funds" /> : null)
}));
jest.mock("./modals/USDCDepositModal", () => ({
    __esModule: true,
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Deposit Funds" /> : null)
}));
jest.mock("./modals/SendUsdcModal", () => ({
    __esModule: true,
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Send" /> : null)
}));

describe("GameWalletActions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows the available balance and opens the same three modals", () => {
        render(<GameWalletActions usdcBalance="25.800000" numericUsdcBalance={25.8} sendTokens={sendTokens} />);

        expect(screen.getByText("$25.80")).toBeInTheDocument();
        expect(screen.getByText("USDC")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
        expect(screen.getByRole("dialog", { name: "Deposit Funds" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
        expect(screen.getByRole("dialog", { name: "Withdraw Funds" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Send" }));
        expect(screen.getByRole("dialog", { name: "Send" })).toBeInTheDocument();
        expect(sendTokens).not.toHaveBeenCalled();
    });

    it("reports a failed balance refresh", async () => {
        const onRefresh = jest.fn().mockRejectedValue(new Error("offline"));
        render(<GameWalletActions usdcBalance="0.00" numericUsdcBalance={0} sendTokens={sendTokens} onRefresh={onRefresh} />);

        fireEvent.click(screen.getByRole("button", { name: "Refresh balance" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Balance couldn’t refresh");
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });
});
