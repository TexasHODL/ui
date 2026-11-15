import type { NetworkEndpoints } from "./cosmos/urls";
import { fetchAddressUsdcMicro, formatProfileWalletBalance, usdcMicroAmount } from "./addressUsdcBalance";

const network = { name: "Texas Hodl", rpc: "rpc", rest: "rest", grpc: "grpc", ws: "ws" } as NetworkEndpoints;
const getBalance = jest.fn();
let mockClient: { getBalance: typeof getBalance } | null = { getBalance };

jest.mock("./cosmos/client", () => ({
    getCosmosClient: () => mockClient
}));

describe("usdcMicroAmount", () => {
    it("reads a bigint from getBalance", () => {
        expect(usdcMicroAmount(39892077n)).toBe("39892077");
    });

    it("reads a coin amount string", () => {
        expect(usdcMicroAmount({ denom: "usdc", amount: "39892077" })).toBe("39892077");
    });

    it("rejects a balance it cannot read", () => {
        expect(() => usdcMicroAmount({ denom: "usdc" })).toThrow("Unexpected USDC balance");
        expect(() => usdcMicroAmount(null)).toThrow("Unexpected USDC balance");
        expect(() => usdcMicroAmount("")).toThrow("Unexpected USDC balance");
    });
});

describe("fetchAddressUsdcMicro", () => {
    beforeEach(() => {
        getBalance.mockReset();
        mockClient = { getBalance };
    });

    it("asks the header's client for this address's usdc balance", async () => {
        getBalance.mockResolvedValue(39892077n);
        await expect(fetchAddressUsdcMicro(network, "b52player")).resolves.toBe("39892077");
        expect(getBalance).toHaveBeenCalledWith("b52player", "usdc");
    });

    it("fails closed when the client is missing", async () => {
        mockClient = null;
        await expect(fetchAddressUsdcMicro(network, "b52player")).rejects.toThrow("Block52 client not initialized");
    });

    it("does not query a blank address", async () => {
        await expect(fetchAddressUsdcMicro(network, "")).rejects.toThrow("Address is required");
        expect(getBalance).not.toHaveBeenCalled();
    });
});

describe("formatProfileWalletBalance", () => {
    it("ceilings micro-USDC to cents like the other money cards", () => {
        expect(formatProfileWalletBalance("39892077", false, false)).toBe("39.90");
    });

    it("keeps a whole-dollar balance and a zero balance", () => {
        expect(formatProfileWalletBalance("1000000", false, false)).toBe("1.00");
        expect(formatProfileWalletBalance("0", false, false)).toBe("0.00");
    });

    it("groups a balance that does not fit in a JS number", () => {
        expect(formatProfileWalletBalance("100000000000000000000", false, false)).toBe("100,000,000,000,000.00");
    });

    it("shows an ellipsis while the read is in flight", () => {
        expect(formatProfileWalletBalance(null, true, false)).toBe("…");
        expect(formatProfileWalletBalance("39892077", true, false)).toBe("…");
    });

    it("shows a dash when the read failed or returned nothing", () => {
        expect(formatProfileWalletBalance(null, false, true)).toBe("—");
        expect(formatProfileWalletBalance("39892077", false, true)).toBe("—");
        expect(formatProfileWalletBalance(null, false, false)).toBe("—");
        expect(formatProfileWalletBalance("not-money", false, false)).toBe("—");
    });
});
