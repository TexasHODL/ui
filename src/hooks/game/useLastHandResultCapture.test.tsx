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
