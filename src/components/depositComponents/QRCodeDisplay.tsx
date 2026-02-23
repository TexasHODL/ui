import React, { useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./DepositComponents.module.css";

interface QRCodeDisplayProps {
    depositAddress: string;
    title?: string;
    subtitle?: string;
}

/**
 * Displays a QR code for USDC deposits with copy-to-clipboard functionality
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    depositAddress,
    title = "USDT",
    subtitle = "Tether"
}) => {
    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    return (
        <>
            <div
                className={`backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg transition-all duration-300 ${styles.panelCard}`}
            >
                <h2 className={`text-lg font-semibold mb-2 ${styles.titleText}`}>
                    {title}
                </h2>
                <p className={`text-sm mb-4 ${styles.secondaryText}`}>
                    {subtitle}
                </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                    <QRCodeSVG value={`ethereum:${depositAddress}`} size={200} level="H" />
                </div>
            </div>

            {/* Payment Address */}
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-400">Payment address</label>
                    <div
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${styles.valuePanel}`}
                        onClick={() => copyToClipboard(depositAddress)}
                    >
                        <span className={`text-sm ${styles.valueText}`}>
                            {depositAddress}
                        </span>
                        <button
                            className="ml-2 p-1 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                            type="button"
                        >
                            <svg
                                className={`w-4 h-4 ${styles.iconPrimary}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default QRCodeDisplay;
