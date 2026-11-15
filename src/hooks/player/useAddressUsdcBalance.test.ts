import { act, renderHook, waitFor } from "@testing-library/react";
import type { NetworkEndpoints } from "../../utils/cosmos/urls";
import { useAddressUsdcBalance } from "./useAddressUsdcBalance";

const ADDRESS = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const mockBaseNetwork = { name: "Texas Hodl", rpc: "rpc", rest: "https://node.texashodl.net", grpc: "grpc", ws: "ws" } as NetworkEndpoints;
let mockNetwork: NetworkEndpoints = mockBaseNetwork;
const getBalance = jest.fn();
let mockClient: { getBalance: typeof getBalance } | null = { getBalance };

jest.mock("../../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: mockNetwork })
}));

jest.mock("../../utils/cosmos/client", () => ({
    getCosmosClient: () => mockClient
}));

describe("useAddressUsdcBalance", () => {
    beforeEach(() => {
        mockNetwork = mockBaseNetwork;
        getBalance.mockReset();
        mockClient = { getBalance };
    });

    it("does not query without an address", () => {
        const { result } = renderHook(() => useAddressUsdcBalance(undefined));
        expect(getBalance).not.toHaveBeenCalled();
        expect(result.current).toEqual({ micro: null, loading: false, error: null });
    });

    it("reads the address usdc balance from the cosmos client", async () => {
        getBalance.mockResolvedValue(39892077n);
        const { result } = renderHook(() => useAddressUsdcBalance(ADDRESS));

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.micro).toBe("39892077");
        expect(result.current.error).toBeNull();
        expect(getBalance).toHaveBeenCalledWith(ADDRESS, "usdc");
    });

    it("keeps the card's data empty when the node errors", async () => {
        getBalance.mockRejectedValue(new Error("node down"));
        const { result } = renderHook(() => useAddressUsdcBalance(ADDRESS));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.micro).toBeNull();
        expect(result.current.error).toBe("node down");
    });

    it("describes a non-error rejection", async () => {
        getBalance.mockRejectedValue("nope");
        const { result } = renderHook(() => useAddressUsdcBalance(ADDRESS));

        await waitFor(() => expect(result.current.error).toBe("Failed to fetch wallet balance"));
        expect(result.current.micro).toBeNull();
    });

    it("ignores a late reply for the previous address", async () => {
        let resolveOld: (value: bigint) => void = () => {};
        getBalance.mockImplementationOnce(() => new Promise(resolve => (resolveOld = resolve)));
        getBalance.mockResolvedValueOnce(5n);

        const { result, rerender } = renderHook(({ address }) => useAddressUsdcBalance(address), { initialProps: { address: "b52old" } });
        rerender({ address: "b52new" });

        await waitFor(() => expect(result.current.micro).toBe("5"));
        await act(async () => {
            resolveOld(9n);
        });
        expect(result.current.micro).toBe("5");
        expect(getBalance).toHaveBeenLastCalledWith("b52new", "usdc");
    });

    it("clears the balance when the address goes blank and refetches on a network change", async () => {
        getBalance.mockResolvedValue(1n);
        const initial: { address: string | undefined } = { address: ADDRESS };
        const { result, rerender } = renderHook(({ address }) => useAddressUsdcBalance(address), { initialProps: initial });
        await waitFor(() => expect(result.current.micro).toBe("1"));

        rerender({ address: undefined });
        await waitFor(() => expect(result.current).toEqual({ micro: null, loading: false, error: null }));

        getBalance.mockResolvedValueOnce(2n);
        mockNetwork = { ...mockBaseNetwork, rest: "https://other.example" };
        rerender({ address: ADDRESS });
        await waitFor(() => expect(result.current.micro).toBe("2"));
    });
});
