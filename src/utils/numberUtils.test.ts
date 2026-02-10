import {
    formatBalance,
    formatToFixed,
    formatWeiToDollars,
    formatWeiToSimpleDollars,
    formatWinningAmount,
    formatUSDCToSimpleDollars,
    formatForSitAndGo,
    formatForCashGame,
    formatChipAmount,
    convertAmountToBigInt
} from "./numberUtils";

describe("numberUtils", () => {
    describe("formatBalance", () => {
        it("should format balance from USDC micro-units (6 decimals) to dollars", () => {
            expect(formatBalance("1000000")).toBe("1.00");      // 1 USDC
            expect(formatBalance("2500000")).toBe("2.50");      // 2.5 USDC
            expect(formatBalance("100000000")).toBe("100.00");  // 100 USDC
        });

        it("should handle zero balance", () => {
            expect(formatBalance("0")).toBe("0.00");
            expect(formatBalance(0)).toBe("0.00");
        });
    });

    describe("formatToFixed", () => {
        it("should format number to 2 decimal places", () => {
            expect(formatToFixed(1.5)).toBe("1.50");
            expect(formatToFixed(10)).toBe("10.00");
            expect(formatToFixed(0.123)).toBe("0.12");
        });
    });

    describe("formatWeiToDollars", () => {
        it("should format wei amount to dollars with commas", () => {
            expect(formatWeiToDollars("1000000000000000000")).toBe("1.00");
            expect(formatWeiToDollars("1000000000000000000000")).toBe("1,000.00");
        });

        it("should handle undefined and null", () => {
            expect(formatWeiToDollars(undefined)).toBe("0.00");
            expect(formatWeiToDollars(null)).toBe("0.00");
        });

        it("should handle bigint", () => {
            expect(formatWeiToDollars(BigInt("1000000000000000000"))).toBe("1.00");
        });
    });

    describe("formatWeiToSimpleDollars", () => {
        it("should format wei amount to simple dollars without commas", () => {
            expect(formatWeiToSimpleDollars("1000000000000000000")).toBe("1.00");
            expect(formatWeiToSimpleDollars("1000000000000000000000")).toBe("1000.00");
        });

        it("should handle undefined and null", () => {
            expect(formatWeiToSimpleDollars(undefined)).toBe("0.00");
            expect(formatWeiToSimpleDollars(null)).toBe("0.00");
        });
    });

    describe("formatWinningAmount", () => {
        it("should format winning amount with commas", () => {
            expect(formatWinningAmount("100")).toBe("100.00");
            expect(formatWinningAmount("1000")).toBe("1,000.00");
            expect(formatWinningAmount("1234567.89")).toBe("1,234,567.89");
        });
    });

    describe("formatUSDCToSimpleDollars", () => {
        it("should format USDC (6 decimals) to dollars", () => {
            expect(formatUSDCToSimpleDollars("1000000")).toBe("1.00");
            expect(formatUSDCToSimpleDollars("2500000")).toBe("2.50");
            expect(formatUSDCToSimpleDollars("100000000")).toBe("100.00");
        });

        it("should handle undefined and null", () => {
            expect(formatUSDCToSimpleDollars(undefined)).toBe("0.00");
            expect(formatUSDCToSimpleDollars(null)).toBe("0.00");
        });

        it("should handle bigint", () => {
            expect(formatUSDCToSimpleDollars(BigInt("1000000"))).toBe("1.00");
        });
    });

    describe("formatForSitAndGo", () => {
        it("should format stack values as whole numbers with commas", () => {
            expect(formatForSitAndGo(10000)).toBe("10,000");
            expect(formatForSitAndGo(1500)).toBe("1,500");
            expect(formatForSitAndGo(100)).toBe("100");
        });

        it("should floor decimal values", () => {
            expect(formatForSitAndGo(1500.75)).toBe("1,500");
        });
    });

    describe("formatForCashGame", () => {
        it("should format with dollar sign and 2 decimals", () => {
            expect(formatForCashGame(100)).toBe("$100.00");
            expect(formatForCashGame(25.5)).toBe("$25.50");
            expect(formatForCashGame(0)).toBe("$0.00");
        });
    });

    describe("formatChipAmount", () => {
        it("should convert from wei format to USDC dollars", () => {
            // 960000000000000000000 Wei -> 9.60 USDC
            expect(formatChipAmount("960000000000000000000")).toBe("9.60");
            // 100000000000000000000 Wei -> 1.00 USDC
            expect(formatChipAmount("100000000000000000000")).toBe("1.00");
        });

        it("should handle undefined and null", () => {
            expect(formatChipAmount(undefined)).toBe("0.00");
            expect(formatChipAmount(null)).toBe("0.00");
        });
    });

    describe("convertAmountToBigInt", () => {
        it("should convert amount string to bigint with decimals", () => {
            expect(convertAmountToBigInt("1", 18)).toBe(BigInt("1000000000000000000"));
            expect(convertAmountToBigInt("1", 6)).toBe(BigInt("1000000"));
        });

        it("should return 0 for empty or invalid values", () => {
            expect(convertAmountToBigInt("", 18)).toBe(BigInt(0));
            expect(convertAmountToBigInt("0", 18)).toBe(BigInt(0));
        });
    });
});
