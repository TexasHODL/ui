import { formatAddress } from "./utils";

describe("common utils", () => {
    describe("formatAddress", () => {
        it("should format standard Ethereum address", () => {
            const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
            expect(formatAddress(address)).toBe("0x742d...0bEb");
        });

        it("should format checksum address", () => {
            const address = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
            expect(formatAddress(address)).toBe("0x5aAe...eAed");
        });

        it("should show first 6 and last 4 characters", () => {
            const address = "0xabcdefghijklmnopqrstuvwxyz123456";
            const result = formatAddress(address);
            expect(result.startsWith("0xabcd")).toBe(true);
            expect(result.endsWith("3456")).toBe(true);
            expect(result).toContain("...");
        });

        it("should return empty string for undefined", () => {
            expect(formatAddress(undefined)).toBe("");
        });

        it("should handle short addresses gracefully", () => {
            const shortAddress = "0x123456";
            const result = formatAddress(shortAddress);
            expect(result).toBe("0x1234...3456");
        });

        it("should preserve case", () => {
            const mixedCase = "0xAbCdEf1234567890123456789012345678901234";
            const result = formatAddress(mixedCase);
            expect(result).toBe("0xAbCd...1234");
        });

        it("should handle zero address", () => {
            const zeroAddress = "0x0000000000000000000000000000000000000000";
            expect(formatAddress(zeroAddress)).toBe("0x0000...0000");
        });
    });
});
