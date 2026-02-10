/**
 * Cosmos Client creation and management
 *
 * This file provides a minimal wrapper around the SDK's CosmosClient
 * with singleton pattern for the frontend.
 */

import { CosmosClient, createSigningClientFromMnemonic, getDefaultCosmosConfig as getDefaultCosmosConfigSDK, COSMOS_CONSTANTS } from "@block52/poker-vm-sdk";
import { getCosmosAddress, getCosmosMnemonic } from "./storage";
import { getCosmosUrls, type NetworkEndpoints } from "./urls";

// Re-export types and constants from SDK
export type { CosmosClient };
export { COSMOS_CONSTANTS };

// Re-export getCosmosUrls for REST endpoint queries
export { getCosmosUrls };

/**
 * Get default cosmos configuration with environment variable overrides
 * Uses SDK's getDefaultCosmosConfig() and overrides with env vars if present
 */
export const getDefaultCosmosConfig = (network: NetworkEndpoints) => {
    const sdkConfig = getDefaultCosmosConfigSDK();
    const { rpcEndpoint, restEndpoint } = getCosmosUrls(network);

    return {
        ...sdkConfig,
        rpcEndpoint,
        restEndpoint,
    };
};

/**
 * Get cosmos configuration with custom endpoints
 * Used when switching networks dynamically
 */
export const getCosmosConfigWithEndpoints = (rpcEndpoint: string, restEndpoint: string) => {
    const sdkConfig = getDefaultCosmosConfigSDK();

    return {
        ...sdkConfig,
        rpcEndpoint,
        restEndpoint,
    };
};

/**
 * Get singleton Cosmos client instance
 * This ensures we reuse the same client across the app
 */
let clientInstance: CosmosClient | null = null;
let currentEndpoints: { rpc: string; rest: string } | null = null;

export const getCosmosClient = (
    networkOrEndpoints: NetworkEndpoints | { rpc: string; rest: string }
): CosmosClient | null => {
    // Determine if we have custom endpoints or a network config
    const customEndpoints = "rpc" in networkOrEndpoints && "rest" in networkOrEndpoints && !("name" in networkOrEndpoints)
        ? networkOrEndpoints as { rpc: string; rest: string }
        : null;

    const network = customEndpoints ? null : networkOrEndpoints as NetworkEndpoints;

    // Get the actual endpoints to use (either custom or from network config)
    const newEndpoints = customEndpoints
        ? { rpc: customEndpoints.rpc, rest: customEndpoints.rest }
        : { rpc: network!.rpc, rest: network!.rest };

    // Clear client if endpoints have changed (network switch or custom endpoint change)
    if (
        currentEndpoints &&
        (currentEndpoints.rpc !== newEndpoints.rpc || currentEndpoints.rest !== newEndpoints.rest)
    ) {
        console.log("🔄 [CosmosClient] Network changed, clearing cached client");
        console.log("   Old:", currentEndpoints);
        console.log("   New:", newEndpoints);
        clientInstance = null;
    }

    if (!clientInstance) {
        const mnemonic = getCosmosMnemonic();
        const config = customEndpoints
            ? getCosmosConfigWithEndpoints(customEndpoints.rpc, customEndpoints.rest)
            : getDefaultCosmosConfig(network!);

        if (!mnemonic) {
            // For read-only operations (like explorer), create client without mnemonic
            clientInstance = new CosmosClient(config);
        } else {
            clientInstance = new CosmosClient({ ...config, mnemonic });
        }

        // Track current endpoints for change detection
        currentEndpoints = newEndpoints;
        console.log("✅ [CosmosClient] Created new client for:", newEndpoints);
    }

    return clientInstance;
};

/**
 * Clear the cached client instance (useful when changing wallets or networks)
 */
export const clearCosmosClient = (): void => {
    clientInstance = null;
    currentEndpoints = null;
};

/**
 * Creates a signing client for performing player actions on the Cosmos blockchain.
 *
 * This is a wrapper around createSigningClientFromMnemonic that:
 * - Retrieves the mnemonic from storage
 * - Configures the client with the correct network endpoints
 * - Uses consistent chain configuration (chainId, prefix, denom, gasPrice)
 *
 * @param network - The network configuration to use
 * @returns Promise with the signing client
 * @throws Error if Cosmos wallet is not initialized (no mnemonic or address)
 */
export async function getSigningClient(network: NetworkEndpoints) {
    const userAddress = getCosmosAddress();
    const mnemonic = getCosmosMnemonic();

    if (!userAddress || !mnemonic) {
        throw new Error("Cosmos wallet not initialized. Please create or import a Cosmos wallet first.");
    }

    const { rpcEndpoint, restEndpoint } = getCosmosUrls(network);

    const signingClient = await createSigningClientFromMnemonic(
        {
            rpcEndpoint,
            restEndpoint,
            chainId: COSMOS_CONSTANTS.CHAIN_ID,
            prefix: COSMOS_CONSTANTS.ADDRESS_PREFIX,
            denom: "stake",
            gasPrice: "0stake" // Gasless
        },
        mnemonic
    );

    return { signingClient, userAddress };
}
