/**
 * Buy-in calculation utilities for poker games.
 *
 * Buy-in limits are defined in Big Blinds (BB) and calculated
 * dynamically based on the table's stake level.
 */

export interface BuyInConfig {
    minBuyInBB: number;  // Minimum buy-in in Big Blinds
    maxBuyInBB: number;  // Maximum buy-in in Big Blinds
    bigBlind: number;    // Big blind amount in dollars
}

export interface CalculatedBuyIn {
    minBuyIn: number;    // Calculated minimum buy-in in dollars
    maxBuyIn: number;    // Calculated maximum buy-in in dollars
}

/**
 * Calculate actual buy-in amounts from BB-based configuration.
 *
 * @param config - Buy-in configuration with BB values and big blind amount
 * @returns Calculated buy-in amounts in dollars
 *
 * @example
 * // $0.01/$0.02 game with 20-100 BB buy-in
 * calculateBuyIn({ minBuyInBB: 20, maxBuyInBB: 100, bigBlind: 0.02 })
 * // Returns: { minBuyIn: 0.40, maxBuyIn: 2.00 }
 *
 * @example
 * // $1/$2 game with 50-200 BB buy-in
 * calculateBuyIn({ minBuyInBB: 50, maxBuyInBB: 200, bigBlind: 2 })
 * // Returns: { minBuyIn: 100, maxBuyIn: 400 }
 */
export function calculateBuyIn(config: BuyInConfig): CalculatedBuyIn {
    const { minBuyInBB, maxBuyInBB, bigBlind } = config;

    return {
        minBuyIn: minBuyInBB * bigBlind,
        maxBuyIn: maxBuyInBB * bigBlind
    };
}

/**
 * Validate buy-in BB configuration.
 *
 * @param minBuyInBB - Minimum buy-in in Big Blinds
 * @param maxBuyInBB - Maximum buy-in in Big Blinds
 * @returns Object with isValid flag and optional error message
 */
export function validateBuyInBB(minBuyInBB: number, maxBuyInBB: number): { isValid: boolean; error?: string } {
    if (minBuyInBB < 20) {
        return { isValid: false, error: "Minimum buy-in must be at least 20 BB" };
    }

    if (maxBuyInBB > 500) {
        return { isValid: false, error: "Maximum buy-in cannot exceed 500 BB" };
    }

    if (minBuyInBB >= maxBuyInBB) {
        return { isValid: false, error: "Minimum buy-in must be less than maximum buy-in" };
    }

    return { isValid: true };
}

/**
 * Common buy-in presets used in standard poker games.
 */
export const BUY_IN_PRESETS = {
    STANDARD: { minBuyInBB: 20, maxBuyInBB: 100, label: "Standard (20-100 BB)" },
    DEEP: { minBuyInBB: 40, maxBuyInBB: 200, label: "Deep (40-200 BB)" },
    DEEP_STACK: { minBuyInBB: 100, maxBuyInBB: 300, label: "Deep Stack (100-300 BB)" }
} as const;

/**
 * Format buy-in range as a display string.
 *
 * @param minBuyIn - Minimum buy-in in dollars
 * @param maxBuyIn - Maximum buy-in in dollars
 * @returns Formatted string like "$20.00 - $100.00"
 */
export function formatBuyInRange(minBuyIn: number, maxBuyIn: number): string {
    return `$${minBuyIn.toFixed(2)} - $${maxBuyIn.toFixed(2)}`;
}
