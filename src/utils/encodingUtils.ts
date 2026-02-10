/**
 * Encoding and conversion utility functions
 */

/**
 * Convert a base64-encoded string to hexadecimal format
 * @param base64 - Base64-encoded string
 * @returns Hex string with '0x' prefix
 * @example
 * base64ToHex("SGVsbG8=") // "0x48656c6c6f"
 */
export const base64ToHex = (base64: string): string => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};
