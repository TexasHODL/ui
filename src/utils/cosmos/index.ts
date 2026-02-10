/**
 * Cosmos utilities - centralized exports
 *
 * This module provides all Cosmos-related utilities for wallet management,
 * client creation, and blockchain interactions.
 *
 * Most functionality is delegated to @block52/poker-vm-sdk SDK.
 * This module provides frontend-specific wrappers and utilities.
 */

// Client creation and management
export {
    getCosmosClient,
    clearCosmosClient,
    getDefaultCosmosConfig,
    getSigningClient,
    COSMOS_CONSTANTS,
    type CosmosClient
} from "./client";

// Storage utilities
export {
    getCosmosMnemonic,
    getCosmosAddress,
    setCosmosMnemonic,
    setCosmosAddress,
    clearCosmosData,
    getFormattedCosmosAddress,
    STORAGE_COSMOS_MNEMONIC,
    STORAGE_COSMOS_ADDRESS
} from "./storage";

// Helper functions
export {
    isValidSeedPhrase,
    getTestAddresses
} from "./helpers";

// Signing utilities for authenticated WebSocket queries
export {
    signQueryMessage,
    createAuthPayload
} from "./signing";
