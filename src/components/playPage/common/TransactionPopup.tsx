import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

interface TransactionPopupProps {
    txHash: string | null;
    onClose: () => void;
}

/**
 * Transaction popup component that appears in the bottom right corner
 * Shows transaction hash with copy and explorer link functionality
 * Auto-closes after 5 seconds
 */
const TransactionPopup: React.FC<TransactionPopupProps> = ({ txHash, onClose }) => {
    // Only show in development mode
    const isDevelopment = import.meta.env.VITE_NODE_ENV === "development";

    // Auto-close after 5 seconds
    useEffect(() => {
        if (txHash && isDevelopment) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [txHash, onClose, isDevelopment]);

    // Don't show popup in production
    if (!isDevelopment) return null;
    if (!txHash) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-slide-in-bottom-right">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-sm w-full">
                <div className="p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-green-400 font-semibold text-xs">
                            Transaction Submitted
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Close"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Transaction Hash */}
                    <div className="bg-gray-900 rounded p-2 mb-2">
                        <p className="text-gray-400 text-[10px] mb-1">Transaction Hash:</p>
                        <div className="flex items-center gap-2">
                            <code className="text-green-400 text-xs font-mono break-all flex-1">
                                {txHash}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(txHash);
                                    toast.success("Transaction hash copied!");
                                }}
                                className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                title="Copy transaction hash"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Link
                            to={`/explorer/tx/${txHash}`}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors text-center"
                        >
                            View on Explorer
                        </Link>
                        <button
                            onClick={onClose}
                            className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionPopup;
