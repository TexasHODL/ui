import { useState, useEffect } from "react";
import axios from "axios";
import { PROXY_URL } from "../../../config/constants";
import spinner from "../../../assets/spinning-circles.svg";
import styles from "./CurrencySelector.module.css";

interface Currency {
    symbol: string;
    displaySymbol: string;
    name: string;
    logo?: string;
}

import type { CurrencySelectorProps } from "../types";

// Only BTC and USDT supported
const SUPPORTED_CURRENCIES: Currency[] = [
    { symbol: "btc", displaySymbol: "BTC", name: "Bitcoin", logo: "₿" },
    { symbol: "usdterc20", displaySymbol: "USDT", name: "Tether", logo: "₮" }
];

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ selectedCurrency, onCurrencySelect }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            <label className="block text-sm font-medium text-gray-400">
                Select the Crypto Currency to deposit
            </label>

            {/* Currency Grid */}
            <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_CURRENCIES.map((currency) => (
                    <button
                        key={currency.symbol}
                        onClick={() => onCurrencySelect(currency.symbol)}
                        className={`p-3 rounded-lg border transition-all ${
                            selectedCurrency === currency.symbol
                                ? `border-blue-500 bg-gray-900 ${styles.selectedCurrency}`
                                : "border-gray-600 bg-gray-900 hover:border-gray-500"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{currency.logo}</span>
                            <div className="text-left flex-1">
                                <div className="text-white font-semibold uppercase text-sm">
                                    {currency.displaySymbol}
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
