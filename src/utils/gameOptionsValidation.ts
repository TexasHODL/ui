import { GameOptionsDTO } from "@block52/poker-vm-sdk";

export interface GameOptionsValidationResult {
    isValid: boolean;
    missingFields: string[];
    hasCriticalFields: boolean;
}

/**
 * Validates game options from the server to ensure all required fields are present
 *
 * @param options - The game options DTO to validate
 * @returns Validation result indicating if options are valid, missing fields, and critical field status
 *
 * Critical fields (must be present):
 * - smallBlind
 * - bigBlind
 *
 * Required fields (logged as warnings if missing):
 * - timeout
 * - minBuyIn
 * - maxBuyIn
 * - maxPlayers
 * - minPlayers
 */
export function validateGameOptions(
    options: GameOptionsDTO | null | undefined
): GameOptionsValidationResult {
    const missingFields: string[] = [];

    // If options is null or undefined, return invalid immediately
    if (!options) {
        return {
            isValid: false,
            missingFields: ["all fields (options is null/undefined)"],
            hasCriticalFields: false
        };
    }

    // Check all required fields using explicit null/undefined checks.
    // Per Commandment 9, blind/buyIn fields are strings — a falsy check (!value)
    // would incorrectly reject 0 (number) which JSON.parse may produce.
    if (options.smallBlind == null || options.smallBlind === "") missingFields.push("smallBlind");
    if (options.bigBlind == null || options.bigBlind === "") missingFields.push("bigBlind");
    if (options.timeout == null) missingFields.push("timeout");
    if (options.minBuyIn == null || options.minBuyIn === "") missingFields.push("minBuyIn");
    if (options.maxBuyIn == null || options.maxBuyIn === "") missingFields.push("maxBuyIn");
    if (options.maxPlayers == null) missingFields.push("maxPlayers");
    if (options.minPlayers == null) missingFields.push("minPlayers");

    // Check critical fields (smallBlind, bigBlind)
    const hasCriticalFields = options.smallBlind != null && options.smallBlind !== ""
        && options.bigBlind != null && options.bigBlind !== "";

    // Log warnings for missing fields
    if (missingFields.length > 0) {
        console.error("⚠️ Missing game options fields from server:", missingFields);
    }

    // Log error for missing critical fields
    if (!hasCriticalFields) {
        console.error("⚠️ Cannot display game options: missing critical fields (smallBlind or bigBlind)");
    }

    return {
        isValid: hasCriticalFields,
        missingFields,
        hasCriticalFields
    };
}
