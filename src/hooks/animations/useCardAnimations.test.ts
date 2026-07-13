import { renderHook, act } from "@testing-library/react";
import { useCardAnimations } from "./useCardAnimations";
import { useGameStateContext } from "../../context/GameStateContext";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { DEFAULT_DECORATION, AnimationHint, GameEvent, GameStreamItem } from "../../bus/types";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";

jest.mock("../../context/GameStateContext");
jest.mock("../../context/gameState/GameEventsContext");

const mockUseGameStateContext = useGameStateContext as jest.MockedFunction<typeof useGameStateContext>;
const mockUseGameEventsContext = useGameEventsContext as jest.MockedFunction<typeof useGameEventsContext>;

let seq = 0;
function makeItem(events: GameEvent[], animations: AnimationHint[] = []): GameStreamItem {
    seq += 1;
    return {
        seq,
        receivedAt: 0,
        kind: "state",
        classified: { kind: "actionAccepted" } as GameStreamItem["classified"],
        events,
        decoration: { ...DEFAULT_DECORATION, animations },
        raw: {}
    };
}

function setCommunityCards(cards: string[]) {
    mockUseGameStateContext.mockReturnValue({ gameState: { communityCards: cards } } as ReturnType<typeof useGameStateContext>);
}

function dealHint(cards: string[], round: TexasHoldemRound): AnimationHint {
    return { kind: "dealCards", staggerMs: 100, cards, round };
}

describe("useCardAnimations", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        seq = 0;
        setCommunityCards([]);
        mockUseGameEventsContext.mockReturnValue({ latestItem: null });
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it("staggers the flop flips from a dealCards hint", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());
        expect(result.current.flipped1).toBe(false);

        setCommunityCards(["AH", "KD", "2C"]);
        mockUseGameEventsContext.mockReturnValue({
            latestItem: makeItem(
                [{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }],
                [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)]
            )
        });
        rerender();

        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);
        expect(result.current.flipped2).toBe(true);
        expect(result.current.flipped3).toBe(true);
        expect(result.current.showThreeCards).toBe(true);
    });

    it("RE-TRIGGERS on the turn (fixes the flop-only bug)", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());

        // Flop first.
        setCommunityCards(["AH", "KD", "2C"]);
        mockUseGameEventsContext.mockReturnValue({
            latestItem: makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }], [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)])
        });
        rerender();
        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);

        // Turn: one new card. The hook must reset and re-run — not stay static.
        setCommunityCards(["AH", "KD", "2C", "7S"]);
        mockUseGameEventsContext.mockReturnValue({
            latestItem: makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.FLOP, to: TexasHoldemRound.TURN, newCommunityCards: ["7S"] }], [dealHint(["7S"], TexasHoldemRound.TURN)])
        });
        rerender();
        // Immediately after the turn commit the flips reset.
        expect(result.current.flipped1).toBe(false);
        act(() => jest.advanceTimersByTime(100));
        expect(result.current.flipped1).toBe(true);
        expect(result.current.flipped2).toBe(false);
    });

    it("RESETS the flips on a new hand (fixes the no-reset-per-hand bug)", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());

        setCommunityCards(["AH", "KD", "2C"]);
        mockUseGameEventsContext.mockReturnValue({
            latestItem: makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }], [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)])
        });
        rerender();
        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);

        // New hand — board cleared, flips must reset.
        setCommunityCards([]);
        mockUseGameEventsContext.mockReturnValue({ latestItem: makeItem([{ type: "handStarted", handNumber: 2 }]) });
        rerender();
        expect(result.current.flipped1).toBe(false);
        expect(result.current.flipped2).toBe(false);
        expect(result.current.flipped3).toBe(false);
    });
});
