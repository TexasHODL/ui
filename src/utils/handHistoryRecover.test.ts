import { PlayerStatus, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import type { NetworkEndpoints } from "../context/NetworkContext";
import type { HandListItem } from "../pages/explorer/types";
import type { PlayerHand, PlayerSession } from "../types/players";
import { encodeStringField1 } from "./abciQuery";
import { loadPublicHandState, recoverUnlistedHands, type HistoryRpc } from "./handHistoryRecover";

const network: NetworkEndpoints = {
    name: "Localhost",
    rpc: "http://rpc.test",
    rest: "http://rest.test",
    grpc: "http://grpc.test",
    ws: "ws://rpc.test/ws"
};

const listed = (hand_number: number): PlayerHand => ({
    game_id: "0xabc",
    hand_number,
    seat: 1,
    status: "folded",
    won_amount: 0,
    block_height: 60,
    community_cards: ["AH"],
    winner_count: 1
});

const gameHand = (hand_number: number, block_height: number, game_id = "0xabc"): HandListItem => ({
    game_id,
    hand_number,
    block_height,
    deck_seed: "",
    deck: "",
    tx_hash: "",
    created_at: ""
});

const session = (join_block: number, leave_block?: number, game_id = "0xabc"): PlayerSession => ({
    player_address: "hero",
    game_id,
    join_block,
    leave_block,
    buy_in_amount: 0,
    created_at: ""
});

function chainState(handNumber: number, viewerPlayed: boolean): TexasHoldemStateDTO {
    return {
        handNumber,
        communityCards: ["AH", "KD", "7C"],
        winners: [],
        previousActions: viewerPlayed ? [{ playerId: "hero", seat: 2, action: "fold" }] : [{ playerId: "other", seat: 1, action: "fold" }],
        players: [
            {
                seat: 2,
                address: "hero",
                status: PlayerStatus.FOLDED,
                holeCards: viewerPlayed ? ["QH", "QD"] : ["X", "X"]
            },
            { seat: 3, address: "shown", status: PlayerStatus.SHOWING, holeCards: ["AS", "AD"] },
            { seat: 4, address: "mucked", status: PlayerStatus.MUCKED, holeCards: ["QS", "QC"] }
        ]
    } as unknown as TexasHoldemStateDTO;
}

function abci(json: string) {
    const hex = encodeStringField1(json).slice(2);
    return { result: { response: { code: 0, value: Buffer.from(hex, "hex").toString("base64") } } };
}

function rpcFor(states: Map<number, TexasHoldemStateDTO | "prune" | "next">, searched: number[]): HistoryRpc {
    return {
        txSearch: async query => {
            const match = query.match(/hand_number='(\d+)'/);
            const handNumber = Number(match?.[1]);
            searched.push(handNumber);
            // End block is a multiple of 10 so the previous block still rounds back to this hand.
            return { result: { txs: [{ height: String(handNumber * 10) }] } };
        },
        abciQuery: async (_path, _data, height) => {
            const handNumber = Math.round(height / 10);
            const state = states.get(handNumber);
            if (state === "prune") throw new Error("version does not exist");
            // The end block itself has already moved on to the next hand.
            if (height % 10 === 0 || !state || state === "next") {
                return abci(JSON.stringify({ handNumber: handNumber + 1 }));
            }
            return abci(JSON.stringify(state));
        }
    };
}

describe("recoverUnlistedHands", () => {
    it("adds a played hand the indexer skipped and ignores sit-out and hands outside the session", async () => {
        const searched: number[] = [];
        const states = new Map<number, TexasHoldemStateDTO | "prune" | "next">([
            [11, chainState(11, true)],
            [9, chainState(9, false)]
        ]);
        const err = jest.spyOn(console, "error").mockImplementation(() => {});
        const recovered = await recoverUnlistedHands({
            address: "hero",
            listed: [listed(12)],
            sessions: async () => ({
                data: [session(10, 80)],
                pagination: { limit: 100, offset: 0, total: 1 }
            }),
            gameHands: async () => ({
                data: [gameHand(12, 70), gameHand(11, 50), gameHand(9, 40), gameHand(8, 200)],
                pagination: { limit: 1000, offset: 0, total: 4 }
            }),
            rpcFor: () => rpcFor(states, searched),
            networks: [network]
        });
        err.mockRestore();

        expect(recovered.hands.map(hand => hand.hand_number)).toEqual([11]);
        expect(recovered.hands[0]).toMatchObject({ seat: 2, status: PlayerStatus.FOLDED, block_height: 110 });
        expect(recovered.states.get("0xabc#11")?.handNumber).toBe(11);
        expect(searched.sort((a, b) => a - b)).toEqual([9, 11]);
    });

    it("skips a hand whose state has been pruned", async () => {
        const searched: number[] = [];
        const err = jest.spyOn(console, "error").mockImplementation(() => {});
        const recovered = await recoverUnlistedHands({
            address: "hero",
            listed: [],
            sessions: async () => ({ data: [session(1)], pagination: { limit: 100, offset: 0, total: 1 } }),
            gameHands: async () => ({
                data: [gameHand(4, 20)],
                pagination: { limit: 1000, offset: 0, total: 1 }
            }),
            rpcFor: () => rpcFor(new Map([[4, "prune"]]), searched),
            networks: [network]
        });
        err.mockRestore();
        expect(recovered.hands).toEqual([]);
        expect(searched).toEqual([4]);
    });
});

describe("loadPublicHandState", () => {
    it("uses the previous block when the end block already shows the next hand", async () => {
        const calls: number[] = [];
        const rpc: Pick<HistoryRpc, "abciQuery"> = {
            abciQuery: async (_path, _data, height) => {
                calls.push(height);
                if (height === 80) return abci(JSON.stringify({ handNumber: 16 }));
                return abci(JSON.stringify(chainState(15, true)));
            }
        };
        const state = await loadPublicHandState("0xabc", 15, 80, [network], () => rpc);
        expect(calls).toEqual([80, 79]);
        expect(state?.handNumber).toBe(15);
        expect(state?.players?.[0].holeCards).toEqual(["QH", "QD"]);
    });
});
