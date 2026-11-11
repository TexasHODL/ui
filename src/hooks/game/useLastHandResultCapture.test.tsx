import { renderHook, waitFor } from "@testing-library/react";
import { PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { useLastHandResultCapture } from "./useLastHandResultCapture";
import { getFinishingHand } from "../../utils/finishingHand";

let mockState: any;
const mockHistory: { hands: Array<{ game_id: string; hand_number: number; block_height: number }>; state: unknown } = { hands: [], state: null };
jest.mock("../../context/GameStateContext", () => ({ useGameStateContext: () => ({ gameState: mockState }) }));
jest.mock("./useWinnerInfo", () => ({ useWinnerInfo: () => ({ winnerInfo: [] }) }));
jest.mock("../../context/IndexerApiContext", () => ({
    useIndexerApi: () => ({ getPlayerHands: async () => ({ data: mockHistory.hands }) })
}));
jest.mock("../../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: { name: "Localhost", rpc: "http://127.0.0.1:26657", rest: "http://127.0.0.1:1317" } }),
    NETWORK_PRESETS: []
}));
jest.mock("../../context/CosmosApiContext", () => ({
    useCometRpcApiFactory: () => () => ({ abciQuery: async () => { throw new Error("unused"); } })
}));
jest.mock("../../utils/handHistoryRecover", () => ({
    loadPublicHandState: async () => mockHistory.state
}));

const end = (handNumber: number) => ({
    handNumber, round: TexasHoldemRound.END, communityCards: ["AH", "KD", "7C", "2H", "9S"],
    players: [{ address: "hero", seat: 2, status: PlayerStatus.ALL_IN, holeCards: ["KS", "KC"] }],
    winners: [{ address: "villain", amount: "600" }], results: [{ playerId: "hero", place: 3, payout: "0" }]
});

it("captures a newly finished player and retains that hand when the tournament moves on", () => {
    mockState = { ...end(10), round: TexasHoldemRound.RIVER, winners: [], results: [] };
    const { rerender } = renderHook(() => useLastHandResultCapture("capture-live"));
    mockState = end(10);
    rerender();
    expect(getFinishingHand("capture-live", "hero")?.handNumber).toBe(10);
    mockState = end(11);
    rerender();
    expect(getFinishingHand("capture-live", "hero")?.handNumber).toBe(10);
});

it("gives every finisher in the end snapshot that hand, including a cold open", () => {
    mockState = {
        handNumber: 20, round: TexasHoldemRound.END, communityCards: ["AH", "KD", "7C", "2H", "9S"],
        previousActions: [
            { playerId: "first", action: "all-in" },
            { playerId: "second", action: "all-in" },
            { playerId: "third", action: "all-in" },
            { playerId: "hero", action: "all-in" }
        ],
        winners: [{ address: "first", amount: "4000", description: "Three of a kind" }],
        players: [
            { address: "first", seat: 1, status: PlayerStatus.SHOWING, holeCards: ["AS", "AD"] },
            { address: "second", seat: 2, status: PlayerStatus.SHOWING, holeCards: ["KH", "KD"] },
            { address: "third", seat: 3, status: PlayerStatus.BUSTED, holeCards: ["QC", "QH"] },
            { address: "hero", seat: 4, status: PlayerStatus.BUSTED, holeCards: ["7H", "AS"] }
        ],
        results: [
            { playerId: "first", place: 1, payout: "3000" },
            { playerId: "second", place: 2, payout: "1000" },
            { playerId: "third", place: 3, payout: "0" },
            { playerId: "hero", place: 4, payout: "0" }
        ]
    };
    renderHook(() => useLastHandResultCapture("capture-cold"));
    for (const address of ["first", "second", "third", "hero"]) {
        const hand = getFinishingHand("capture-cold", address);
        expect(hand?.handNumber).toBe(20);
        expect(hand?.players.find(player => player.address === "hero")?.cards).toEqual(["7H", "AS"]);
        expect(hand?.players.find(player => player.address === "first")?.cards).toEqual(["AS", "AD"]);
    }
});

it("does not attach a finisher who is not in this end snapshot", () => {
    mockState = end(21);
    mockState.results = [
        { playerId: "hero", place: 4, payout: "0" },
        { playerId: "earlier", place: 6, payout: "0" }
    ];
    mockState.players = [{ address: "hero", seat: 2, status: PlayerStatus.ALL_IN, holeCards: ["KS", "KC"] }];
    renderHook(() => useLastHandResultCapture("capture-stranger"));
    expect(getFinishingHand("capture-stranger", "earlier")).toBeNull();
    expect(getFinishingHand("capture-stranger", "hero")?.handNumber).toBe(21);
});

it("rebuilds a bust from an earlier hand once the table has moved on", async () => {
    mockHistory.hands = [{ game_id: "capture-past", hand_number: 8, block_height: 100 }];
    mockHistory.state = {
        handNumber: 8, round: TexasHoldemRound.END, communityCards: ["AH", "KD", "7C", "2H", "9S"],
        previousActions: [{ playerId: "hero", action: "all-in" }, { playerId: "winner", action: "all-in" }],
        winners: [{ address: "winner", amount: "9000", description: "Pair of aces" }],
        players: [
            { address: "winner", seat: 1, status: PlayerStatus.SHOWING, holeCards: ["JH", "AH"] },
            { address: "hero", seat: 4, status: PlayerStatus.BUSTED, holeCards: ["7H", "AS"] }
        ],
        results: [{ playerId: "hero", place: 4, payout: "0" }]
    };
    mockState = {
        handNumber: 12, round: TexasHoldemRound.PREFLOP, communityCards: [],
        players: [{ address: "winner", seat: 1, status: PlayerStatus.ACTIVE, holeCards: ["X", "X"] }],
        winners: [], results: [{ playerId: "hero", place: 4, payout: "0" }]
    };
    localStorage.setItem("user_cosmos_address", "hero");
    renderHook(() => useLastHandResultCapture("capture-past"));
    await waitFor(() => expect(getFinishingHand("capture-past", "hero")?.handNumber).toBe(8));
    const hand = getFinishingHand("capture-past", "hero");
    expect(hand?.players.find(player => player.address === "hero")?.cards).toEqual(["7H", "AS"]);
    expect(hand?.players.find(player => player.address === "winner")?.cards).toEqual(["JH", "AH"]);
    expect(hand?.board).toEqual(["AH", "KD", "7C", "2H", "9S"]);
});

it("waits for the end frame and keeps cards that frame then clears", () => {
    localStorage.setItem("user_cosmos_address", "hero");
    const reveal = {
        handNumber: 40, round: TexasHoldemRound.SHOWDOWN, communityCards: ["AH", "KD", "7C", "2H", "9S"],
        previousActions: [
            { playerId: "winner", action: "all-in" },
            { playerId: "seat2", action: "all-in" },
            { playerId: "hero", action: "all-in" }
        ],
        winners: [],
        results: [],
        players: [
            { address: "winner", seat: 1, status: PlayerStatus.ALL_IN, holeCards: ["JH", "AH"] },
            { address: "seat2", seat: 2, status: PlayerStatus.ALL_IN, holeCards: ["QS", "QC"] },
            { address: "hero", seat: 4, status: PlayerStatus.ALL_IN, holeCards: ["7H", "AS"] }
        ]
    };
    mockState = reveal;
    const { rerender } = renderHook(() => useLastHandResultCapture("capture-reveal"));
    expect(getFinishingHand("capture-reveal", "hero")).toBeNull();
    mockState = {
        ...reveal, round: TexasHoldemRound.END,
        results: [{ playerId: "hero", place: 3, payout: "0" }],
        winners: [{ address: "winner", amount: "9000", description: "Pair of aces" }],
        players: [
            { address: "winner", seat: 1, status: PlayerStatus.SHOWING, holeCards: ["JH", "AH"] },
            { address: "seat2", seat: 2, status: PlayerStatus.BUSTED, holeCards: ["X", "X"] },
            { address: "hero", seat: 4, status: PlayerStatus.BUSTED, holeCards: ["X", "X"] }
        ]
    };
    rerender();
    expect(getFinishingHand("capture-reveal", "hero")?.players.map(player => [player.seat, player.cards])).toEqual([
        [1, ["JH", "AH"]],
        [2, ["QS", "QC"]],
        [4, ["7H", "AS"]]
    ]);
});

it("waits for the matching END frame if placement arrives before the winners", () => {
    mockState = { ...end(30), results: [] };
    const { rerender } = renderHook(() => useLastHandResultCapture("capture-order"));
    mockState = { ...end(31), winners: [] };
    rerender();
    expect(getFinishingHand("capture-order", "hero")).toBeNull();
    mockState = end(31);
    rerender();
    expect(getFinishingHand("capture-order", "hero")?.handNumber).toBe(31);
});
