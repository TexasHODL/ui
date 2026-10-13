import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SendUsdcModal from "./SendUsdcModal";

const RECIPIENT = "b521" + "q".repeat(38);

function renderSend(sendTokens = jest.fn().mockResolvedValue("tx-1"), onClose = jest.fn(), numericUsdcBalance = 10) {
    render(
        <SendUsdcModal
            isOpen
            onClose={onClose}
            usdcBalance="10.000000"
            numericUsdcBalance={numericUsdcBalance}
            sendTokens={sendTokens}
        />
    );
    return { sendTokens, onClose };
}

describe("SendUsdcModal", () => {
    it("sends a valid amount in micro-units and closes", async () => {
        const { sendTokens, onClose } = renderSend();

        fireEvent.change(screen.getByLabelText("Recipient Address"), { target: { value: RECIPIENT } });
        fireEvent.change(screen.getByLabelText("Amount (USDC)"), { target: { value: "1.25" } });
        fireEvent.click(screen.getByRole("button", { name: "Send USDC" }));

        await waitFor(() => expect(sendTokens).toHaveBeenCalledWith(RECIPIENT, "1250000", "usdc"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("keeps send disabled for an invalid address or an amount over the balance", () => {
        renderSend();

        fireEvent.change(screen.getByLabelText("Recipient Address"), { target: { value: "not-an-address" } });
        fireEvent.change(screen.getByLabelText("Amount (USDC)"), { target: { value: "1" } });
        expect(screen.getByRole("button", { name: "Send USDC" })).toBeDisabled();

        fireEvent.change(screen.getByLabelText("Recipient Address"), { target: { value: RECIPIENT } });
        fireEvent.change(screen.getByLabelText("Amount (USDC)"), { target: { value: "11" } });
        expect(screen.getByRole("button", { name: "Send USDC" })).toBeDisabled();
    });

    it("shows the wallet error and stays open when the send fails", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        const { sendTokens, onClose } = renderSend(jest.fn().mockRejectedValue(new Error("rpc down")));

        fireEvent.change(screen.getByLabelText("Recipient Address"), { target: { value: RECIPIENT } });
        fireEvent.change(screen.getByLabelText("Amount (USDC)"), { target: { value: "0" } });
        fireEvent.click(screen.getByRole("button", { name: "Send USDC" }));
        expect(await screen.findByText("Please enter a valid amount")).toBeInTheDocument();
        expect(sendTokens).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText("Amount (USDC)"), { target: { value: "1" } });
        fireEvent.click(screen.getByRole("button", { name: "Send USDC" }));
        expect(await screen.findByText("rpc down")).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
