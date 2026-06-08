import axios from "axios";

import { GatewayApi, GatewayActionRequest } from "../apis/GatewayApi";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const action: GatewayActionRequest = {
    gameId: "game-1",
    action: "call",
    index: 7,
    amount: "1000000",
    timestamp: 1717600000000,
    address: "b521cjzphr67dug28rw9ueewrqllmxlqe5f0qtfu64",
    signature: "0x7cc70101d16ab50fb42882f886e4f34276cf26bdc2d45b4e79b862ccdc1a47de0a8914ca52a079039d4457aee88a1951936992b180d3bbcf6d7c6c7a7f8f1d0e1b",
    data: ""
};

describe("GatewayApi", () => {
    let gatewayApi: GatewayApi;
    let mockAxiosInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() }
            }
        };
        mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
        gatewayApi = new GatewayApi({ baseUrl: "https://pvm.block52.xyz/gateway", secure: false });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("submitAction", () => {
        it("POSTs the signed action and returns ack with post-action state", async () => {
            const ack = { type: "ack", gameId: "game-1", index: 7, state: { actionIndex: 7, round: "preflop" } };
            mockAxiosInstance.post.mockResolvedValueOnce({ data: ack });

            const result = await gatewayApi.submitAction(action);

            expect(result).toEqual(ack);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith("/actions", action, undefined);
        });

        it("throws the gateway's validation rejection (422 error body)", async () => {
            const rejection = { type: "error", gameId: "game-1", index: 7, error: "signature rejected: signature recovers to b52x, not b52y" };
            mockAxiosInstance.post.mockRejectedValueOnce({ response: { data: rejection, status: 422 } });

            await expect(gatewayApi.submitAction(action)).rejects.toEqual(rejection);
        });

        it("throws on network failure", async () => {
            const networkError = new Error("Network Error");
            mockAxiosInstance.post.mockRejectedValueOnce(networkError);

            await expect(gatewayApi.submitAction(action)).rejects.toBe(networkError);
        });
    });

    describe("health", () => {
        it("GETs the liveness probe", async () => {
            mockAxiosInstance.get.mockResolvedValueOnce({ data: { status: "ok" } });

            await expect(gatewayApi.health()).resolves.toEqual({ status: "ok" });
            expect(mockAxiosInstance.get).toHaveBeenCalledWith("/health", undefined);
        });
    });
});
