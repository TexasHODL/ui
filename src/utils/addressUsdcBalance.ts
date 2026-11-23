/**
 * USDC bank balance for a profile address.
 *
 * The table header reads the connected wallet with `client.getBalance`. A
 * profile shows someone else's address, so this asks that same client for the
 * address in the URL. It does not touch the indexer.
 */
import { formatMicroUsd } from "./moneyDisplay";
import { getCosmosClient } from "./cosmos/client";
import type { NetworkEndpoints } from "./cosmos/urls";
import { hasContent, isRecord, isString } from "@block52/ui-sdk/helpers";

const PENDING = "…";
const UNKNOWN = "—";

/** Micro-USDC string from `CosmosClient.getBalance` (a bigint, or a coin). */
export function usdcMicroAmount(balance: unknown): string {
    if (typeof balance === "bigint") return balance.toString();
    if (isString(balance) && hasContent(balance)) return balance;
    if (isRecord(balance) && isString(balance.amount) && hasContent(balance.amount)) return balance.amount;
    throw new Error("Unexpected USDC balance");
}

/** One bank read for `address`. Rejects when the client is missing or the node errors. */
export async function fetchAddressUsdcMicro(network: NetworkEndpoints, address: string): Promise<string> {
    if (!hasContent(address)) {
        throw new Error("Address is required");
    }
    const client = getCosmosClient(network);
    if (!client) {
        throw new Error("Block52 client not initialized");
    }
    const balance = await client.getBalance(address, "usdc");
    return usdcMicroAmount(balance);
}

/**
 * Wallet Balance card label, in the same cents format as the other money cards.
 * An in-flight read is an ellipsis. A failed read is a dash, never a zero.
 */
export function formatProfileWalletBalance(micro: string | null, pending: boolean, failed: boolean): string {
    if (pending) return PENDING;
    if (failed || !hasContent(micro)) return UNKNOWN;
    return formatMicroUsd(micro, true);
}
