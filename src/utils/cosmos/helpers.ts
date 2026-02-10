/**
 * Cosmos utility helper functions
 *
 * This file provides minimal helpers, delegating to SDK where possible.
 */

import { isValidMnemonic } from "@block52/poker-vm-sdk";

/**
 * Validates if a seed phrase is valid BIP39 mnemonic
 * Re-exports SDK's isValidMnemonic function for consistency with existing code
 */
export const isValidSeedPhrase = isValidMnemonic;

/**
 * Get test addresses (alice and bob from config)
 * These are the same addresses used in the Cosmos chain config.yml
 */
export const getTestAddresses = () => ({
    alice: "b521rgaelup3yzxt6puf593k5wq3mz8k0m2pvkfj9p",
    bob: "b521lk6fjllpzykqhpp72vyvvskeffsjzfh97kmq75"
});
