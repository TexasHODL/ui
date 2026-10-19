import { renderHook, waitFor } from "@testing-library/react";
import { PlayerStatus, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../../context/NetworkContext";
import type { PlayerHand } from "../../types/players";
import { encodeStringField1 } from "../../utils/abciQuery";
import { useHandHistoryCards } from "./useHandHistoryCards";
import { useCometRpcApiFactory } from "../../context/CosmosApiContext";

jest.mock("../../context/CosmosApiContext", () => ({ useCometRpcApiFactory: jest.fn() }));

const network: NetworkEndpoints = {
    name: "Localhost",
    rpc: "http://rpc.test",
    rest: "http://rest.test",
    grpc: "http://grpc.test",
    ws: "ws://rpc.test/ws"
};

const hand: PlayerHand = {
    game_id: "0xabc",
    hand_number: 15,
    seat: 1,
    status: "showing",
    won_amount: 0,
    block_height: 80,
    community_cards: ["AH", "KD", "7C", "2S", "9H"],
    winner_count: 1
};

const state = {
    handNumber: 15,
    communityCards: ["AH", "KD", "7C", "2S", "9H"],
    winners: [{ address: "hero", amount: "500" }],
    previousActions: [{ playerId: "hero", seat: 1, action: "show" }],
    players: [
        { seat: 1, address: "hero", status: PlayerStatus.SHOWING, holeCards: ["QH", "QD"] },
        { seat: 2, address: "villain", status: PlayerStatus.SHOWING, holeCards: ["AS", "AD"] },
        { seat: 3, address: "mucked", status: PlayerStatus.MUCKED, holeCards: ["QS", "QC"] }
    ]
} as unknown as TexasHoldemStateDTO;

function abci(json: string) {
    const hex = encodeStringField1(json).slice(2);
    return { result: { response: { code: 0, value: Buffer.from(hex, "hex").toString("base64") } } };
}

describe("useHandHistoryCards", () => {
    it("loads showdown cards from the public end state and hides mucked cards", async () => {
        const abciQuery = jest.fn(async (_path: string, _data: string, height: number) => {
            if (height === 80) return abci(JSON.stringify({ handNumber: 16 }));
            return abci(JSON.stringify(state));
        });
        (useCometRpcApiFactory as jest.Mock).mockReturnValue(() => ({ abciQuery }));

        const { result } = renderHook(() => useHandHistoryCards([hand], "hero", new Map(), [network]));
        await waitFor(() => expect(result.current.get("0xabc#15")?.seats).toBeDefined());
        const shown = result.current.get("0xabc#15");
        expect(shown?.board).toEqual(["AH", "KD", "7C", "2S", "9H"]);
        expect(shown?.seats.map(seat => [seat.yours ? "you" : seat.seat, seat.cards])).toEqual([
            ["you", ["QH", "QD"]],
            [2, ["AS", "AD"]]
        ]);
        expect(abciQuery).toHaveBeenCalledTimes(2);
    });

    it("uses a recovered snapshot without asking the chain again", async () => {
        const abciQuery = jest.fn();
        (useCometRpcApiFactory as jest.Mock).mockReturnValue(() => ({ abciQuery }));
        const seeded = new Map([["0xabc#15", state]]);
        const { result } = renderHook(() => useHandHistoryCards([hand], "hero", seeded, [network]));
        await waitFor(() => expect(result.current.get("0xabc#15")?.seats[0].yours).toBe(true));
        expect(abciQuery).not.toHaveBeenCalled();
    });
});
