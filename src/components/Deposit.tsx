import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCosmosWallet } from "../hooks";
import { colors, getAnimationGradient, hexToRgba } from "../utils/colorConfig";
import { microToUsdc } from "../constants/currency";
import DepositCore from "./modals/DepositCore";

const Deposit: React.FC = () => {
    const cosmosWallet = useCosmosWallet();
    const navigate = useNavigate();

    // Get USDC balance from Cosmos wallet (formatted to 2 decimal places)
    const b52Balance = useMemo(() => {
        const usdcBalance = cosmosWallet.balance.find(b => b.denom === "usdc");
        if (!usdcBalance) return "0.00";
        return microToUsdc(usdcBalance.amount).toFixed(2);
    }, [cosmosWallet.balance]);

    // Mouse position for animated background
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Mouse movement handler - throttled
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => {
                const x = Math.round((e.clientX / window.innerWidth) * 100);
                const y = Math.round((e.clientY / window.innerHeight) * 100);
                setMousePosition(prev => {
                    if (Math.abs(prev.x - x) > 2 || Math.abs(prev.y - y) > 2) {
                        return { x, y };
                    }
                    return prev;
                });
                animationFrameRef.current = undefined;
            });
        }
    }, []);

    // Set up mouse tracking
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [handleMouseMove]);

    // Animated background styles matching Dashboard
    const backgroundStyle1 = useMemo(
        () => ({
            backgroundImage: getAnimationGradient(mousePosition.x, mousePosition.y),
            backgroundColor: colors.table.bgBase,
            filter: "blur(40px)",
            transition: "all 0.3s ease-out"
        }),
        [mousePosition.x, mousePosition.y]
    );

    const backgroundStyle2 = useMemo(
        () => ({
            backgroundImage: `
            repeating-linear-gradient(
                ${45 + mousePosition.x / 10}deg,
                ${hexToRgba(colors.animation.color2, 0.1)} 0%,
                ${hexToRgba(colors.animation.color1, 0.1)} 25%,
                ${hexToRgba(colors.animation.color4, 0.1)} 50%,
                ${hexToRgba(colors.animation.color5, 0.1)} 75%,
                ${hexToRgba(colors.animation.color2, 0.1)} 100%
            )
        `,
            backgroundSize: "400% 400%",
            animation: "gradient 15s ease infinite",
            transition: "background 0.5s ease"
        }),
        [mousePosition.x]
    );

    const backgroundStyle3 = useMemo(
        () => ({
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${hexToRgba(colors.brand.primary, 0.1)} 25%, rgba(0,0,0,0) 50%, ${hexToRgba(
                colors.brand.primary,
                0.1
            )} 75%, rgba(0,0,0,0) 100%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 8s infinite linear"
        }),
        []
    );

    const handleGoBack = () => {
        navigate("/");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white relative px-4 overflow-hidden">
            {/* Animated background layers - matching Dashboard */}
            <div className="fixed inset-0 z-0" style={backgroundStyle1} />
            <div className="fixed inset-0 z-0 opacity-20" style={backgroundStyle2} />
            <div className="fixed inset-0 z-0 opacity-30" style={backgroundStyle3} />

            {/* Back button */}
            <button
                type="button"
                className="absolute top-8 left-8 flex items-center gap-2 py-2 px-4 text-sm font-semibold text-gray-300 hover:text-white transition-colors z-10"
                onClick={handleGoBack}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            <div className="w-full max-w-md bg-gray-800 rounded-lg border border-gray-700 overflow-hidden z-10">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Deposit Funds</h2>
                    <p className="text-sm text-gray-400 mt-1">Add USDC to your game wallet</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Balances */}
                    <div className="space-y-3 mb-6">
                        <div className="p-3 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Game Wallet Balance</span>
                            <span className="text-white font-semibold">${b52Balance} USDC</span>
                        </div>
                    </div>

                    {/* Use the reusable DepositCore component */}
                    <DepositCore showMethodSelector={true} />
                </div>
            </div>
        </div>
    );
};

export default Deposit;
