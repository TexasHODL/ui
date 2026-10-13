import { formatMicroAsUsdc, microToUsdc } from "../constants/currency";

export interface DenomAmount {
    denom: string;
    amount: string;
}

/** USDC slice of a Cosmos balance list, in the same shape the lobby wallet panel uses. */
export function readUsdcBalance(balances: readonly DenomAmount[]): { formatted: string; numeric: number } {
    const balance = balances.find(entry => entry.denom === "usdc");
    if (!balance) {
        return { formatted: "0.00", numeric: 0 };
    }
    return {
        formatted: formatMicroAsUsdc(balance.amount, 6),
        numeric: microToUsdc(balance.amount)
    };
}
