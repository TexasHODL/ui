/**
 * Browser storage utilities for Cosmos wallet data
 */

// Storage keys for cosmos data
export const STORAGE_COSMOS_MNEMONIC = "user_cosmos_mnemonic";
export const STORAGE_COSMOS_ADDRESS = "user_cosmos_address";

/**
 * Get the user's cosmos mnemonic from browser storage
 * @returns The mnemonic string or null if not found
 */
export const getCosmosMnemonic = (): string | null => {
    return localStorage.getItem(STORAGE_COSMOS_MNEMONIC);
};

/**
 * Get the user's cosmos address from browser storage
 * @returns The address string or null if not found
 */
export const getCosmosAddress = (): string | null => {
    return localStorage.getItem(STORAGE_COSMOS_ADDRESS);
};

/**
 * Set the user's cosmos mnemonic in browser storage
 * @param mnemonic The mnemonic to store
 */
export const setCosmosMnemonic = (mnemonic: string): void => {
    localStorage.setItem(STORAGE_COSMOS_MNEMONIC, mnemonic);
};

/**
 * Set the user's cosmos address in browser storage
 * @param address The address to store
 */
export const setCosmosAddress = (address: string): void => {
    localStorage.setItem(STORAGE_COSMOS_ADDRESS, address);
};

/**
 * Remove the user's cosmos data from browser storage
 */
export const clearCosmosData = (): void => {
    localStorage.removeItem(STORAGE_COSMOS_MNEMONIC);
    localStorage.removeItem(STORAGE_COSMOS_ADDRESS);
};

/**
 * Get formatted cosmos address for display (shortened with ellipsis)
 * @returns Formatted address string like "b521234...abcd" or empty string if no address
 */
export const getFormattedCosmosAddress = (length: number = 6): string => {
    const address = getCosmosAddress();
    if (!address) return "";
    return `${address.slice(0, length)}...${address.slice(-4)}`;
};
