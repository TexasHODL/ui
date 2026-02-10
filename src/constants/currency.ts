/**
 * Currency conversion constants for USDC
 *
 * USDC uses 6 decimal places (micro-denominations)
 * 1 USDC = 1,000,000 micro-USDC
 *
 * All internal calculations should use bigint with 10^6 precision.
 * Convert to string only when sending over the wire (JSON serialization).
 * Convert to number only for display purposes.
 */

/** Number of micro-units per 1 USDC (10^6) */
export const USDC_DECIMALS = 6;

/** Conversion factor: 1 USDC = 1,000,000 micro-USDC */
export const USDC_TO_MICRO = 1_000_000;

/** Conversion factor as bigint for precise calculations */
export const USDC_TO_MICRO_BIGINT = 1_000_000n;

/** Conversion factor: 1 micro-USDC = 0.000001 USDC */
export const MICRO_TO_USDC = 1 / 1_000_000;

/**
 * Convert USDC dollars to micro-units (bigint)
 * @param usdcAmount Amount in USDC (e.g., 1.50)
 * @returns Amount in micro-units as bigint (e.g., 1500000n)
 */
export function usdcToMicroBigInt(usdcAmount: number): bigint {
    // Multiply by 10^6, then convert to bigint to avoid floating point issues
    return BigInt(Math.floor(usdcAmount * USDC_TO_MICRO));
}

/**
 * Convert USDC dollars to micro-units
 * @param usdcAmount Amount in USDC (e.g., 1.50)
 * @returns Amount in micro-units (e.g., 1500000)
 * @deprecated Use usdcToMicroBigInt for internal calculations
 */
export function usdcToMicro(usdcAmount: number): number {
    return Math.floor(usdcAmount * USDC_TO_MICRO);
}

/**
 * Convert micro-units (bigint) to USDC dollars for display
 * @param microAmount Amount in micro-units as bigint (e.g., 1500000n)
 * @returns Amount in USDC as number (e.g., 1.50)
 */
export function microBigIntToUsdc(microAmount: bigint): number {
    return Number(microAmount) / USDC_TO_MICRO;
}

/**
 * Convert micro-units to USDC dollars
 * @param microAmount Amount in micro-units (e.g., 1500000)
 * @returns Amount in USDC (e.g., 1.50)
 */
export function microToUsdc(microAmount: number | string | bigint): number {
    if (typeof microAmount === "bigint") {
        return Number(microAmount) / USDC_TO_MICRO;
    }
    const amount = typeof microAmount === "string" ? parseFloat(microAmount) : microAmount;
    return amount / USDC_TO_MICRO;
}

/**
 * Parse a micro-unit value (string, number, or bigint) to bigint
 * Use this when receiving values from the API/wire format
 * @param value The value to parse
 * @returns The value as bigint
 */
export function parseMicroToBigInt(value: string | number | bigint | undefined): bigint {
    if (value === undefined || value === null) return 0n;
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.floor(value));
    // Handle string - remove any decimal places (shouldn't have any for micro-units)
    const parsed = value.includes(".") ? value.split(".")[0] : value;
    return BigInt(parsed || "0");
}

/**
 * Convert bigint micro-units to string for wire transmission (JSON)
 * @param microAmount Amount in micro-units as bigint
 * @returns String representation for JSON serialization
 */
export function microBigIntToString(microAmount: bigint): string {
    return microAmount.toString();
}

/**
 * Format micro-units as USDC with specified decimal places
 * @param microAmount Amount in micro-units
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted USDC string (e.g., "1.50")
 */
export function formatMicroAsUsdc(microAmount: number | string | bigint, decimals: number = 2): string {
    return microToUsdc(microAmount).toFixed(decimals);
}
