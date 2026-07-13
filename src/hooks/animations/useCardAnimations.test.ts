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

let ackAnimation: jest.Mock;

/** Set the events-context return, always wiring the current ackAnimation spy. */
function setLatestItem(latestItem: GameStreamItem | null) {
    mockUseGameEventsContext.mockReturnValue({ latestItem, ackAnimation });
}

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

function dealHint(cards: string[], round: TexasHoldemRound, ackId?: string): AnimationHint {
    return { kind: "dealCards", staggerMs: 100, cards, round, ackId, ackTimeoutMs: ackId ? 1800 : undefined };
}

describe("useCardAnimations", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        seq = 0;
        ackAnimation = jest.fn();
        setCommunityCards([]);
        setLatestItem(null);
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it("staggers the flop flips from a dealCards hint", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());
        expect(result.current.flipped1).toBe(false);

        setCommunityCards(["AH", "KD", "2C"]);
        setLatestItem(
            makeItem(
                [{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }],
                [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)]
            )
        );
        rerender();

        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);
        expect(result.current.flipped2).toBe(true);
        expect(result.current.flipped3).toBe(true);
        expect(result.current.showThreeCards).toBe(true);
    });

    it("acks the bus when the last flip's reveal completes (Phase 5)", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());

        setCommunityCards(["AH", "KD", "2C"]);
        setLatestItem(
            makeItem(
                [{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }],
                [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP, "7:0")]
            )
        );
        rerender();

        // Last flip flag flips at stagger×3 = 300ms; reveal finishes 1000ms later.
        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped3).toBe(true);
        expect(ackAnimation).not.toHaveBeenCalled();

        act(() => jest.advanceTimersByTime(1000));
        expect(ackAnimation).toHaveBeenCalledTimes(1);
        expect(ackAnimation).toHaveBeenCalledWith("7:0");
    });

    it("does not leak an ack timer after unmount (bus timeout is the backstop)", () => {
        const { rerender, unmount } = renderHook(() => useCardAnimations());

        setCommunityCards(["AH", "KD", "2C"]);
        setLatestItem(
            makeItem(
                [{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }],
                [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP, "9:0")]
            )
        );
        rerender();

        // Unmount mid-animation: the ack timer must be cleared, so it never fires.
        unmount();
        act(() => jest.advanceTimersByTime(5000));
        expect(ackAnimation).not.toHaveBeenCalled();
    });

    it("RE-TRIGGERS on the turn (fixes the flop-only bug)", () => {
        const { result, rerender } = renderHook(() => useCardAnimations());

        // Flop first.
        setCommunityCards(["AH", "KD", "2C"]);
        setLatestItem(makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }], [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)]));
        rerender();
        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);

        // Turn: one new card. The hook must reset and re-run — not stay static.
        setCommunityCards(["AH", "KD", "2C", "7S"]);
        setLatestItem(makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.FLOP, to: TexasHoldemRound.TURN, newCommunityCards: ["7S"] }], [dealHint(["7S"], TexasHoldemRound.TURN)]));
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
        setLatestItem(makeItem([{ type: "roundAdvanced", from: TexasHoldemRound.PREFLOP, to: TexasHoldemRound.FLOP, newCommunityCards: ["AH", "KD", "2C"] }], [dealHint(["AH", "KD", "2C"], TexasHoldemRound.FLOP)]));
        rerender();
        act(() => jest.advanceTimersByTime(300));
        expect(result.current.flipped1).toBe(true);

        // New hand — board cleared, flips must reset.
        setCommunityCards([]);
        setLatestItem(makeItem([{ type: "handStarted", handNumber: 2 }]));
        rerender();
        expect(result.current.flipped1).toBe(false);
        expect(result.current.flipped2).toBe(false);
        expect(result.current.flipped3).toBe(false);
    });
});
