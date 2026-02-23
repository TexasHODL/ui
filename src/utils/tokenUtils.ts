import { ETH_USDC_ADDRESS, ETH_USDT_ADDRESS } from "../config/constants";

export type DepositToken = "USDC" | "USDT";

const TOKEN_ADDRESSES: Record<DepositToken, string> = {
    USDC: ETH_USDC_ADDRESS,
    USDT: ETH_USDT_ADDRESS
};

export function getTokenAddress(token: DepositToken): string {
    return TOKEN_ADDRESSES[token];
}
