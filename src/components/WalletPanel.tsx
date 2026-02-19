import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { colors, hexToRgba } from "../utils/colorConfig";
import { useCosmosWallet, useUserWalletConnect } from "../hooks";
import { microToUsdc } from "../constants/currency";

// Copy to clipboard utility
const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
};

interface WalletPanelProps {
    onDeposit: () => void;
    onWithdraw: () => void;
    onTransfer: () => void;
    onCreateWallet: () => void;
    onImportWallet: () => void;
}

/**
 * WalletPanel - Cosmos wallet display component
 * Shows wallet address, balances, and action buttons
 * Styled to match TableList component
 */
const WalletPanel: React.FC<WalletPanelProps> = ({
    onDeposit,
    onWithdraw,
    onTransfer,
    onCreateWallet,
    onImportWallet
}) => {
    const navigate = useNavigate();
    const cosmosWallet = useCosmosWallet();
    const { isConnected: isWeb3Connected, open: openWeb3Modal, disconnect: disconnectWeb3, address: web3Address } = useUserWalletConnect();

    // Get USDC balance (formatted to 2 decimal places)
    const usdcBalance = useMemo(() => {
        const balance = cosmosWallet.balance.find(b => b.denom === "usdc");
        if (!balance) return "0.00";
        return microToUsdc(balance.amount).toFixed(2);
    }, [cosmosWallet.balance]);

    // Button style helper
    const buttonStyle = useCallback(
        (color: string) => ({
            background: `linear-gradient(135deg, ${color} 0%, ${hexToRgba(color, 0.8)} 100%)`
        }),
        []
    );

    if (!cosmosWallet.address) {
        // No wallet - show create/import options
        return (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Game Wallet</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-400 mb-6">Create or import a wallet to start playing</p>

                    <div className="space-y-3">
                        <button
                            onClick={onCreateWallet}
                            className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                            style={buttonStyle(colors.brand.primary)}
                        >
                            Create New Wallet
                        </button>
                        <button
                            onClick={onImportWallet}
                            className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 border border-gray-600 bg-transparent hover:bg-gray-700"
                        >
                            Import Existing Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Game Wallet</h2>
                <div className="flex items-center gap-2">
                    {/* Settings Button */}
                    <button
                        onClick={() => navigate("/wallet")}
                        className="p-2 rounded-lg transition-all hover:bg-gray-700 hover:opacity-90"
                        title="Manage Wallet"
                    >
                        <svg
                            className="w-5 h-5 text-gray-400 hover:text-white transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Address */}
                <div className="mb-4">
                    <label className="text-gray-400 text-sm">Address</label>
                    <div className="flex gap-2 items-center mt-1">
                        <input
                            type="text"
                            value={cosmosWallet.address}
                            readOnly
                            className="flex-1 text-white px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 font-mono text-sm truncate"
                        />
                        <button
                            onClick={() => copyToClipboard(cosmosWallet.address || "", "Address")}
                            className="text-white px-3 py-2 rounded-lg transition-all hover:opacity-90 text-sm"
                            style={buttonStyle(colors.brand.primary)}
                        >
                            Copy
                        </button>
                    </div>
                </div>

                {/* USDC Balance */}
                <div className="mb-4">
                    <div className="p-3 rounded-lg bg-gray-900 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: hexToRgba(colors.brand.primary, 0.2) }}
                                >
                                    <span className="font-bold text-lg" style={{ color: colors.brand.primary }}>
                                        $
                                    </span>
                                </div>
                                <div>
                                    <p className="text-white font-bold">USDC Balance</p>
                                    <p className="text-gray-400 text-sm">Gaming funds</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white">${usdcBalance}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onDeposit}
                        className="flex-1 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                        style={buttonStyle(colors.brand.primary)}
                    >
                        Deposit
                    </button>
                    <button
                        onClick={onWithdraw}
                        className="flex-1 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                        style={buttonStyle(colors.brand.primary)}
                    >
                        Withdraw
                    </button>
                    <button
                        onClick={onTransfer}
                        className="flex-1 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                        style={buttonStyle(colors.brand.primary)}
                    >
                        Send
                    </button>
                </div>

                {/* Web3 Wallet Connection (for Ethereum deposits) */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Ethereum Wallet</span>
                        {isWeb3Connected && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Connected</span>
                        )}
                    </div>
                    {isWeb3Connected ? (
                        <div className="space-y-2">
                            <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-700/50">
                                <p className="text-gray-300 text-xs font-mono truncate">{web3Address}</p>
                            </div>
                            <button
                                onClick={disconnectWeb3}
                                className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={openWeb3Modal}
                            className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
                            style={buttonStyle(colors.brand.primary)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Connect Web3 Wallet
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletPanel;
