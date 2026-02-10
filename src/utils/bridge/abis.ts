/**
 * Bridge Contract ABIs
 * 
 * This file centralizes all Bridge contract ABIs used across the application
 * for interacting with the Cosmos Bridge on Base Chain.
 */

/**
 * Bridge contract ABI for withdrawal operations
 * Used to complete withdrawals by calling the withdraw function on the bridge contract
 */
export const BRIDGE_WITHDRAWAL_ABI = [
    "function withdraw(uint256 amount, address receiver, bytes32 nonce, bytes calldata signature) external"
];

/**
 * Bridge contract ABI for deposit operations
 * Used to query deposit information from the bridge contract
 */
export const BRIDGE_DEPOSITS_ABI = [
    "function deposits(uint256) external view returns (string memory account, uint256 amount)"
];
