import {
    calculateBuyIn,
    validateBuyInBB,
    formatBuyInRange,
    BUY_IN_PRESETS,
    BuyInConfig
} from "./buyInUtils";

describe("buyInUtils", () => {
    describe("calculateBuyIn", () => {
        it("should calculate buy-in for micro stakes ($0.01/$0.02)", () => {
            const config: BuyInConfig = {
                minBuyInBB: 20,
                maxBuyInBB: 100,
                bigBlind: 0.02
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBeCloseTo(0.40, 2);
            expect(result.maxBuyIn).toBeCloseTo(2.00, 2);
        });

        it("should calculate buy-in for low stakes ($0.50/$1)", () => {
            const config: BuyInConfig = {
                minBuyInBB: 20,
                maxBuyInBB: 100,
                bigBlind: 1
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBe(20);
            expect(result.maxBuyIn).toBe(100);
        });

        it("should calculate buy-in for mid stakes ($1/$2)", () => {
            const config: BuyInConfig = {
                minBuyInBB: 50,
                maxBuyInBB: 200,
                bigBlind: 2
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBe(100);
            expect(result.maxBuyIn).toBe(400);
        });

        it("should calculate buy-in for high stakes ($5/$10)", () => {
            const config: BuyInConfig = {
                minBuyInBB: 100,
                maxBuyInBB: 300,
                bigBlind: 10
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBe(1000);
            expect(result.maxBuyIn).toBe(3000);
        });

        it("should handle decimal big blinds correctly", () => {
            const config: BuyInConfig = {
                minBuyInBB: 20,
                maxBuyInBB: 100,
                bigBlind: 0.05
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBeCloseTo(1.00, 2);
            expect(result.maxBuyIn).toBeCloseTo(5.00, 2);
        });

        it("should work with deep stack presets", () => {
            const config: BuyInConfig = {
                minBuyInBB: BUY_IN_PRESETS.DEEP_STACK.minBuyInBB,
                maxBuyInBB: BUY_IN_PRESETS.DEEP_STACK.maxBuyInBB,
                bigBlind: 2
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBe(200);  // 100 BB * $2
            expect(result.maxBuyIn).toBe(600);  // 300 BB * $2
        });

        it("should scale correctly across different stake levels", () => {
            const stakes = [0.02, 0.10, 0.50, 1.00, 2.00, 5.00, 10.00];
            const minBB = 20;
            const maxBB = 100;

            stakes.forEach(bigBlind => {
                const result = calculateBuyIn({ minBuyInBB: minBB, maxBuyInBB: maxBB, bigBlind });

                // Verify the ratio is always maintained
                expect(result.minBuyIn / bigBlind).toBe(minBB);
                expect(result.maxBuyIn / bigBlind).toBe(maxBB);
            });
        });
    });

    describe("validateBuyInBB", () => {
        it("should validate correct buy-in ranges", () => {
            expect(validateBuyInBB(20, 100)).toEqual({ isValid: true });
            expect(validateBuyInBB(20, 50)).toEqual({ isValid: true });
            expect(validateBuyInBB(100, 500)).toEqual({ isValid: true });
        });

        it("should reject minimum buy-in below 20 BB", () => {
            const result = validateBuyInBB(10, 100);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe("Minimum buy-in must be at least 20 BB");
        });

        it("should reject maximum buy-in above 500 BB", () => {
            const result = validateBuyInBB(20, 600);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe("Maximum buy-in cannot exceed 500 BB");
        });

        it("should reject when min >= max", () => {
            expect(validateBuyInBB(100, 100).isValid).toBe(false);
            expect(validateBuyInBB(100, 100).error).toBe("Minimum buy-in must be less than maximum buy-in");

            expect(validateBuyInBB(150, 100).isValid).toBe(false);
            expect(validateBuyInBB(150, 100).error).toBe("Minimum buy-in must be less than maximum buy-in");
        });

        it("should validate all presets", () => {
            Object.values(BUY_IN_PRESETS).forEach(preset => {
                const result = validateBuyInBB(preset.minBuyInBB, preset.maxBuyInBB);
                expect(result.isValid).toBe(true);
            });
        });
    });

    describe("formatBuyInRange", () => {
        it("should format buy-in range correctly", () => {
            expect(formatBuyInRange(20, 100)).toBe("$20.00 - $100.00");
            expect(formatBuyInRange(0.40, 2.00)).toBe("$0.40 - $2.00");
            expect(formatBuyInRange(1000, 3000)).toBe("$1000.00 - $3000.00");
        });

        it("should handle decimal precision", () => {
            expect(formatBuyInRange(0.4, 2)).toBe("$0.40 - $2.00");
            expect(formatBuyInRange(19.99, 99.99)).toBe("$19.99 - $99.99");
        });
    });

    describe("BUY_IN_PRESETS", () => {
        it("should have correct standard preset values", () => {
            expect(BUY_IN_PRESETS.STANDARD.minBuyInBB).toBe(20);
            expect(BUY_IN_PRESETS.STANDARD.maxBuyInBB).toBe(100);
        });

        it("should have correct deep preset values", () => {
            expect(BUY_IN_PRESETS.DEEP.minBuyInBB).toBe(40);
            expect(BUY_IN_PRESETS.DEEP.maxBuyInBB).toBe(200);
        });

        it("should have correct deep stack preset values", () => {
            expect(BUY_IN_PRESETS.DEEP_STACK.minBuyInBB).toBe(100);
            expect(BUY_IN_PRESETS.DEEP_STACK.maxBuyInBB).toBe(300);
        });
    });

    describe("integration scenarios", () => {
        it("should correctly calculate for issue #1537 example: $0.01/$0.02 game", () => {
            // From the GitHub issue:
            // Big Blind = $0.02
            // Minimum buy-in: 20 BB → $0.40
            // Maximum buy-in: 300 BB → $6.00
            const config: BuyInConfig = {
                minBuyInBB: 20,
                maxBuyInBB: 300,
                bigBlind: 0.02
            };

            const result = calculateBuyIn(config);

            expect(result.minBuyIn).toBeCloseTo(0.40, 2);
            expect(result.maxBuyIn).toBeCloseTo(6.00, 2);
        });

        it("should format the calculated buy-in for display", () => {
            const config: BuyInConfig = {
                minBuyInBB: 20,
                maxBuyInBB: 100,
                bigBlind: 0.02
            };

            const { minBuyIn, maxBuyIn } = calculateBuyIn(config);
            const formatted = formatBuyInRange(minBuyIn, maxBuyIn);

            expect(formatted).toBe("$0.40 - $2.00");
        });
    });
});
