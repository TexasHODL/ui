import type { NetworkEndpoints } from "../../context/NetworkContext";

// Re-export for convenience
export type { NetworkEndpoints };

/**
 * Centralized Cosmos network URL configuration
 * 
 * Provides consistent access to RPC and REST endpoints across the application.
 * Uses the network selected in the NetworkSelector dropdown.
 */

export interface CosmosUrls {
    rpcEndpoint: string;
    restEndpoint: string;
}

/**
 * Get Cosmos network URLs (RPC and REST endpoints) from the selected network
 * 
 * @param network - The currently selected network from NetworkContext
 * @returns Object containing rpcEndpoint and restEndpoint
 * 
 * @example
 * ```ts
 * const { currentNetwork } = useNetwork();
 * const { rpcEndpoint, restEndpoint } = getCosmosUrls(currentNetwork);
 * const client = await createSigningClientFromMnemonic({ rpcEndpoint, restEndpoint, ... }, mnemonic);
 * ```
 */
export function getCosmosUrls(network: NetworkEndpoints): CosmosUrls {
    return {
        rpcEndpoint: network.rpc,
        restEndpoint: network.rest
    };
}
