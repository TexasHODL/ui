import { formatUsd } from "../../utils/moneyDisplay";
import { ModalHeader } from "../common/ModalHeader";
import React, { useMemo, useState } from "react";
import { usdcToMicroBigInt } from "../../constants/currency";
import type { SendUsdcModalProps } from "./types";
import styles from "./SendUsdcModal.module.css";

// Bech32 address: "b52" prefix + "1" separator + valid bech32 data characters.
const B52_ADDRESS_REGEX = /^b521[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,}$/;

/**
 * Send USDC from the game wallet to another b52 address.
 * Same form the lobby used to render inline.
 */
const SendUsdcModal: React.FC<SendUsdcModalProps> = ({ isOpen, onClose, usdcBalance, numericUsdcBalance, sendTokens }) => {
    const [transferRecipient, setTransferRecipient] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferError, setTransferError] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);

    const isAmountExceedingBalance = useMemo(() => {
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) return false;
        return amount > numericUsdcBalance;
    }, [transferAmount, numericUsdcBalance]);

    const isValidRecipient = useMemo(() => {
        if (!transferRecipient) return false;
        return B52_ADDRESS_REGEX.test(transferRecipient);
    }, [transferRecipient]);

    const close = () => {
        setTransferRecipient("");
        setTransferAmount("");
        setTransferError("");
        onClose();
    };

    const handleCosmosTransfer = async () => {
        try {
            setTransferError("");
            setIsTransferring(true);

            if (!transferRecipient || !transferAmount) {
                setTransferError("Please enter recipient address and amount");
                return;
            }

            if (!B52_ADDRESS_REGEX.test(transferRecipient)) {
                setTransferError("Please enter a valid b52 bech32 address");
                return;
            }

            const amount = parseFloat(transferAmount);
            if (isNaN(amount) || amount <= 0) {
                setTransferError("Please enter a valid amount");
                return;
            }

            // Convert to smallest unit (6 decimals for USDC)
            const amountInSmallestUnit = usdcToMicroBigInt(amount).toString();

            await sendTokens(transferRecipient, amountInSmallestUnit, "usdc");

            setTransferRecipient("");
            setTransferAmount("");
            setTransferError("");
            onClose();
        } catch (err) {
            console.error("Failed to send:", err);
            setTransferError(err instanceof Error ? err.message : "Failed to send");
        } finally {
            setIsTransferring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Send"
                className={`hodl-modal p-6 rounded-xl w-full max-w-sm shadow-2xl border max-h-[90vh] overflow-y-auto ${styles.modalPanel}`}
            >
                <ModalHeader title="Send" />
                <div className="space-y-4">
                    <div className={`p-3 rounded-lg ${styles.balanceBox}`}>
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-gray-400 text-sm">Available Balance:</span>
                            <span className={`font-bold ${styles.brandPrimaryText}`}>{formatUsd(usdcBalance)} USDC</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-white text-sm mb-1" htmlFor="send-usdc-recipient">
                            Recipient Address
                        </label>
                        <input
                            id="send-usdc-recipient"
                            type="text"
                            placeholder="b521abc..."
                            value={transferRecipient}
                            onChange={e => setTransferRecipient(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm mb-1" htmlFor="send-usdc-amount">
                            Amount (USDC)
                        </label>
                        <input
                            id="send-usdc-amount"
                            type="number"
                            step="0.000001"
                            placeholder="0.00"
                            value={transferAmount}
                            onChange={e => setTransferAmount(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                        />
                    </div>
                    {transferError && <p className="text-red-500 text-sm">{transferError}</p>}
                    <div className="flex flex-col space-y-3">
                        <button
                            type="button"
                            onClick={handleCosmosTransfer}
                            disabled={isTransferring || !isValidRecipient || !transferAmount || isAmountExceedingBalance}
                            className={`w-full px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50 hodl-primary ${styles.brandPrimaryBg}`}
                        >
                            {isTransferring ? "Sending..." : "Send USDC"}
                        </button>
                        <button
                            type="button"
                            onClick={close}
                            className={`w-full px-4 py-2 text-sm text-white rounded-lg transition duration-300 shadow-md hover:opacity-90 hodl-secondary ${styles.cancelGradientButton}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendUsdcModal;
