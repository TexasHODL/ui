import { renderHook } from "@testing-library/react";
import { PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { useLastHandResultCapture } from "./useLastHandResultCapture";
import { getFinishingHand } from "../../utils/finishingHand";

let mockState: any;
jest.mock("../../context/GameStateContext", () => ({ useGameStateContext: () => ({ gameState: mockState }) }));
jest.mock("./useWinnerInfo", () => ({ useWinnerInfo: () => ({ winnerInfo: [] }) }));

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

it("does not attach an old placement on arrival to somebody else's hand", () => {
    mockState = end(20);
    renderHook(() => useLastHandResultCapture("capture-late"));
    expect(getFinishingHand("capture-late", "hero")).toBeNull();
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
