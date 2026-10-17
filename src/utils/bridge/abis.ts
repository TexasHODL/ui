/**
 * Bridge Contract ABIs
 * 
 * This file centralizes all Bridge contract ABIs used across the application
 * for interacting with the Cosmos Bridge on Ethereum Mainnet.
 */

/**
 * Bridge contract ABI for deposit operations
 * Used to query deposit information from the bridge contract
 */
export const BRIDGE_DEPOSITS_ABI = [
    "function deposits(uint256) external view returns (string memory account, uint256 amount)"
];
