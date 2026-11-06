import { renderHook, act } from "@testing-library/react";
import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import { useGameStateContext } from "../../context/GameStateContext";
import { useCompletedHandCelebration } from "./useCompletedHandCelebration";
import { celebrationKey, writeCelebrationClock, type CelebrationClock } from "../../utils/completedHandCelebration";

jest.mock("../../context/GameStateContext");

const mockedContext = useGameStateContext as jest.MockedFunction<typeof useGameStateContext>;

const T0 = 1_700_000_000_000;
const TABLE = "table-1";
const WINNER = "0xabc";
const OTHER = "0xdef";

function snapshot(over: Record<string, unknown> = {}) {
    return {
        handNumber: 54,
        round: TexasHoldemRound.END,
        winners: [{ seat: 3, address: WINNER, amount: "30000" }],
        players: [{ seat: 3, address: WINNER, stack: "2000000" }],
        previousActions: [{ timestamp: T0 }],
        ...over
    };
}

function show(state: Record<string, unknown> | null) {
    mockedContext.mockReturnValue({ gameState: state } as ReturnType<typeof useGameStateContext>);
}

describe("useCompletedHandCelebration", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(T0);
        sessionStorage.clear();
        show(snapshot());
    });

    afterEach(() => {
        jest.useRealTimers();
        sessionStorage.clear();
    });

    it("does not restart the five-second cap when the same end snapshot is rendered again", () => {
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.hideCompletedHand).toBe(false);
        expect(result.current.activeWinnerAddresses?.has(WINNER)).toBe(true);

        act(() => {
            jest.advanceTimersByTime(3000);
        });
        expect(result.current.hideCompletedHand).toBe(false);

        show(snapshot());
        rerender();

        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(result.current.hideCompletedHand).toBe(true);
        expect(result.current.activeWinnerAddresses?.size).toBe(0);
    });

    it("clears as soon as the winner leaves and does not resume when they rejoin", () => {
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));

        show(snapshot({ players: [{ seat: 8, address: OTHER, stack: "890000" }] }));
        rerender();
        expect(result.current.hideCompletedHand).toBe(true);
        expect(result.current.activeWinnerAddresses?.has(WINNER)).toBe(false);

        show(snapshot({ players: [{ seat: 3, address: WINNER, stack: "400000" }] }));
        rerender();
        expect(result.current.hideCompletedHand).toBe(true);
        expect(result.current.activeWinnerAddresses?.has(WINNER)).toBe(false);
    });

    it("does not give the celebration to a different player in the same seat", () => {
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        show(snapshot({ players: [{ seat: 3, address: OTHER, stack: "2000000" }] }));
        rerender();
        expect(result.current.activeWinnerAddresses?.has(OTHER)).toBe(false);
        expect(result.current.activeWinnerAddresses?.has(WINNER)).toBe(false);
        expect(result.current.hideCompletedHand).toBe(true);
    });

    it("keeps one split-pot winner when the other leaves, then clears both at the cap", () => {
        show(snapshot({
            winners: [
                { seat: 3, address: WINNER, amount: "15000" },
                { seat: 8, address: OTHER, amount: "15000" }
            ],
            players: [
                { seat: 3, address: WINNER, stack: "1" },
                { seat: 8, address: OTHER, stack: "1" }
            ]
        }));
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.activeWinnerAddresses?.size).toBe(2);

        show(snapshot({
            winners: [
                { seat: 3, address: WINNER, amount: "15000" },
                { seat: 8, address: OTHER, amount: "15000" }
            ],
            players: [{ seat: 8, address: OTHER, stack: "1" }]
        }));
        rerender();
        expect([...(result.current.activeWinnerAddresses ?? [])]).toEqual([OTHER]);
        expect(result.current.hideCompletedHand).toBe(false);

        act(() => {
            jest.advanceTimersByTime(5000);
        });
        expect(result.current.hideCompletedHand).toBe(true);
    });

    it("shows the next hand's table again when it starts before the cap", () => {
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        show(snapshot({
            handNumber: 55,
            round: TexasHoldemRound.PREFLOP,
            winners: [],
            players: [
                { seat: 3, address: WINNER, stack: "1" },
                { seat: 8, address: OTHER, stack: "1" }
            ],
            previousActions: [{ timestamp: T0 + 1000 }]
        }));
        rerender();
        expect(result.current.hideCompletedHand).toBe(false);
        expect(result.current.activeWinnerAddresses).toBeNull();
    });

    it("does not replay a stored celebration that already expired", () => {
        const clock: CelebrationClock = { key: celebrationKey(54, [WINNER]), startedAt: T0 - 9000, retired: [] };
        writeCelebrationClock(sessionStorage, TABLE, clock);
        const { result } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.hideCompletedHand).toBe(true);
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.hideCompletedHand).toBe(true);
    });

    it("finishes a stored in-progress celebration on the original deadline", () => {
        const clock: CelebrationClock = { key: celebrationKey(54, [WINNER]), startedAt: T0 - 1000, retired: [] };
        writeCelebrationClock(sessionStorage, TABLE, clock);
        const { result } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.hideCompletedHand).toBe(false);
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.hideCompletedHand).toBe(false);
        act(() => {
            jest.advanceTimersByTime(3000);
        });
        expect(result.current.hideCompletedHand).toBe(true);
    });

    it("starts a watched run-out at the animation, not at the old chain timestamp", () => {
        show(snapshot({ round: TexasHoldemRound.PREFLOP, winners: [], previousActions: [{ timestamp: T0 - 12000 }] }));
        const { result, rerender } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.hideCompletedHand).toBe(false);

        show(snapshot({ previousActions: [{ timestamp: T0 - 12000 }] }));
        rerender();
        expect(result.current.hideCompletedHand).toBe(false);
        expect(result.current.activeWinnerAddresses?.has(WINNER)).toBe(true);

        act(() => {
            jest.advanceTimersByTime(4999);
        });
        expect(result.current.hideCompletedHand).toBe(false);
        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(result.current.hideCompletedHand).toBe(true);
    });

    it("treats a cold end snapshot older than the cap as already finished", () => {
        show(snapshot({ previousActions: [{ timestamp: T0 - 6000 }] }));
        const { result } = renderHook(() => useCompletedHandCelebration(TABLE, false));
        expect(result.current.hideCompletedHand).toBe(true);
        expect(result.current.celebrateUntil).toBeNull();
    });

    it("leaves a replay of a finished hand on the snapshot", () => {
        show(snapshot({ previousActions: [{ timestamp: T0 - 60000 }] }));
        const { result } = renderHook(() => useCompletedHandCelebration(TABLE, true));
        act(() => {
            jest.advanceTimersByTime(10000);
        });
        expect(result.current.hideCompletedHand).toBe(false);
        expect(result.current.activeWinnerAddresses).toBeNull();
    });
});
