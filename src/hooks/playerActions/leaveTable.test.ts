import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import { getSigningClient } from "../../utils/cosmos/client";
import { executeGatewayAction, getLatestGameState, nextActionIndex } from "./transportAction";
import { getGameTransport } from "../../utils/gameTransport";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import { leaveTable } from "./leaveTable";

jest.mock("../../utils/cosmos/client");
jest.mock("./transportAction");
jest.mock("../../utils/gameTransport");

const mockGetSigningClient = getSigningClient as jest.MockedFunction<typeof getSigningClient>;
const mockExecuteGatewayAction = executeGatewayAction as jest.MockedFunction<typeof executeGatewayAction>;
const mockGetGameTransport = getGameTransport as jest.MockedFunction<typeof getGameTransport>;
const mockNextActionIndex = nextActionIndex as jest.MockedFunction<typeof nextActionIndex>;
const mockGetLatestGameState = getLatestGameState as jest.MockedFunction<typeof getLatestGameState>;

type SigningClient = Awaited<ReturnType<typeof getSigningClient>>["signingClient"];

describe("leaveTable", () => {
    const fakeNetwork = { name: "testnet", rpc: "http://x", rest: "http://y" } as unknown as NetworkEndpoints;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLatestGameState.mockReturnValue(undefined);
        mockNextActionIndex.mockReturnValue(7);
    });

    // WS-first money-mover (#2325): under gateway transport, leave routes through
    // the gateway, which relays the player's pre-signed MsgLeaveGame.
    describe("gateway transport", () => {
        beforeEach(() => mockGetGameTransport.mockReturnValue("gateway"));

        it("routes leave through the gateway (NOT a direct broadcast)", async () => {
            const leaveGame = jest.fn();
            mockGetSigningClient.mockResolvedValue({
                signingClient: { leaveGame } as unknown as SigningClient,
                userAddress: "b52test"
            });
            mockExecuteGatewayAction.mockResolvedValue({
                hash: "gateway:game-gw:7", gameId: "game-gw", action: NonPlayerActionType.LEAVE, amount: "0"
            });

            const result = await leaveTable("game-gw", fakeNetwork);

            expect(mockExecuteGatewayAction).toHaveBeenCalledWith(
                "game-gw", NonPlayerActionType.LEAVE, 7, 0n, "", fakeNetwork
            );
            expect(leaveGame).not.toHaveBeenCalled();
            expect(result).toEqual({ hash: "gateway:game-gw:7", gameId: "game-gw", action: NonPlayerActionType.LEAVE });
        });
    });

    // chain transport (opt-out): leave broadcasts MsgLeaveGame directly.
    describe("chain transport", () => {
        beforeEach(() => mockGetGameTransport.mockReturnValue("chain"));

        it("broadcasts MsgLeaveGame via signingClient.leaveGame with the tableId only", async () => {
            const leaveGame = jest.fn().mockResolvedValue("0xdeadbeef");
            mockGetSigningClient.mockResolvedValue({
                signingClient: { leaveGame } as unknown as SigningClient,
                userAddress: "b52test"
            });

            const result = await leaveTable("game-abc", fakeNetwork);

            expect(leaveGame).toHaveBeenCalledTimes(1);
            expect(leaveGame).toHaveBeenCalledWith("game-abc");
            expect(mockExecuteGatewayAction).not.toHaveBeenCalled();
            expect(result).toEqual({
                hash: "0xdeadbeef",
                gameId: "game-abc",
                action: NonPlayerActionType.LEAVE
            });
        });

        it("propagates chain errors so the modal can surface them inline", async () => {
            mockGetSigningClient.mockResolvedValue({
                signingClient: { leaveGame: jest.fn().mockRejectedValue(new Error("game not found")) } as unknown as SigningClient,
                userAddress: "b52test"
            });

            await expect(leaveTable("game-xyz", fakeNetwork)).rejects.toThrow("game not found");
        });
    });
});
