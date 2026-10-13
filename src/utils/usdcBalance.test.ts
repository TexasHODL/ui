import { readUsdcBalance } from "./usdcBalance";

describe("readUsdcBalance", () => {
    it("reads the usdc denom and ignores other tokens", () => {
        expect(
            readUsdcBalance([
                { denom: "stake", amount: "5" },
                { denom: "usdc", amount: "25800000" }
            ])
        ).toEqual({ formatted: "25.800000", numeric: 25.8 });
    });

    it("treats a missing usdc balance as zero", () => {
        expect(readUsdcBalance([])).toEqual({ formatted: "0.00", numeric: 0 });
    });
});
