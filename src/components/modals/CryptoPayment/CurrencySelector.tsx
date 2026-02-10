import { useState, useEffect } from "react";
import axios from "axios";
import { PROXY_URL } from "../../../config/constants";
import { colors, hexToRgba } from "../../../utils/colorConfig";
import spinner from "../../../assets/spinning-circles.svg";

interface Currency {
    symbol: string;
    name: string;
    logo?: string;
}

import type { CurrencySelectorProps } from "../types";

// Simplified list: BTC, USDT, and ETH - shown by default
const SIMPLIFIED_CURRENCIES = [
    { symbol: "btc", name: "Bitcoin", logo: "₿" },
    { symbol: "usdterc20", name: "USDT (Ethereum)", logo: "₮" },
    { symbol: "eth", name: "Ethereum", logo: "Ξ" }
];

// Full list of popular currencies - shown when toggle is on
const ALL_CURRENCIES = [
    { symbol: "btc", name: "Bitcoin", logo: "₿" },
    { symbol: "usdterc20", name: "USDT (Ethereum)", logo: "₮" },
    { symbol: "eth", name: "Ethereum", logo: "Ξ" },
    { symbol: "ltc", name: "Litecoin", logo: "Ł" },
    { symbol: "doge", name: "Dogecoin", logo: "Ð" },
    { symbol: "bnb", name: "BNB", logo: "BNB" },
    { symbol: "ada", name: "Cardano", logo: "₳" },
    { symbol: "xrp", name: "XRP", logo: "XRP" }
];

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ selectedCurrency, onCurrencySelect }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMoreCurrencies, setShowMoreCurrencies] = useState(false);

    useEffect(() => {
        fetchCurrencies();
    }, []);

    const fetchCurrencies = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${PROXY_URL}/api/nowpayments/currencies`);

            if (!response.data.success) {
                setError("Failed to load currencies");
            }
        } catch (err) {
            console.error("Error fetching currencies:", err);
            setError("Could not connect to payment service");
        } finally {
            setLoading(false);
        }
    };

    // Show simplified or all currencies based on toggle
    const displayedCurrencies = showMoreCurrencies ? ALL_CURRENCIES : SIMPLIFIED_CURRENCIES;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <img src={spinner} className="w-8 h-8" alt="loading" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400 text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-400">
                    Select Cryptocurrency
                </label>
                {/* More options toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">More options</span>
                    <div
                        className={`relative w-8 h-4 rounded-full transition-colors ${
                            showMoreCurrencies ? "bg-blue-600" : "bg-gray-600"
                        }`}
                        onClick={() => setShowMoreCurrencies(!showMoreCurrencies)}
                    >
                        <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                showMoreCurrencies ? "translate-x-4" : "translate-x-0.5"
                            }`}
                        />
                    </div>
                </label>
            </div>

            {/* Currency Grid */}
            <div className="grid grid-cols-2 gap-3">
                {displayedCurrencies.map((currency) => (
                    <button
                        key={currency.symbol}
                        onClick={() => onCurrencySelect(currency.symbol)}
                        className={`p-3 rounded-lg border transition-all ${
                            selectedCurrency === currency.symbol
                                ? "border-blue-500 bg-blue-900/30"
                                : "border-gray-600 bg-gray-900 hover:border-gray-500"
                        }`}
                        style={
                            selectedCurrency === currency.symbol
                                ? {
                                      borderColor: colors.brand.primary,
                                      backgroundColor: hexToRgba(colors.brand.primary, 0.2)
                                  }
                                : {}
                        }
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{currency.logo}</span>
                            <div className="text-left flex-1">
                                <div className="text-white font-semibold uppercase text-sm">
                                    {currency.symbol}
                                </div>
                                <div className="text-gray-400 text-xs">{currency.name}</div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CurrencySelector;
