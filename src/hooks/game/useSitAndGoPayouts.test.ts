import { renderHook } from "@testing-library/react";
import { GameFormat, GameOptionsDTO, PayoutPlaceDTO, TexasHoldemStateDTO, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { useSitAndGoPayouts } from "./useSitAndGoPayouts";

const mockUseGameStateContext = jest.fn();
jest.mock("../../context/GameStateContext", () => ({
    useGameStateContext: () => mockUseGameStateContext()
}));

const buildOptions = (overrides: Partial<GameOptionsDTO> = {}): GameOptionsDTO => ({
    minBuyIn: "10000000",
    maxBuyIn: "10000000",
    minPlayers: 2,
    maxPlayers: 9,
    smallBlind: "25",
    bigBlind: "50",
    timeout: 30,
    ...overrides
});

const buildState = (payouts?: PayoutPlaceDTO[]): TexasHoldemStateDTO => ({
    gameOptions: buildOptions(),
    smallBlindPosition: 1,
    bigBlindPosition: 2,
    dealer: 1,
    players: [],
    communityCards: [],
    deck: "",
    pots: ["0"],
    totalPot: "0",
    nextToAct: 1,
    previousActions: [],
    actionCount: 0,
    handNumber: 0,
    round: TexasHoldemRound.ANTE,
    winners: [],
    results: [],
    legalActions: [],
    availableSeats: [],
    payouts,
    signature: "sig"
});

const setContext = (
    gameState: TexasHoldemStateDTO | undefined,
    gameFormat: GameFormat | undefined = GameFormat.SIT_AND_GO
) => {
    mockUseGameStateContext.mockReturnValue({ gameState, gameFormat });
};

describe("useSitAndGoPayouts — reads PVM-authored payouts[] (block52/ui#513)", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns empty struct when format is cash", () => {
        setContext(buildState([{ place: 1, amount: "20000000" }]), GameFormat.CASH);
        const { result } = renderHook(() => useSitAndGoPayouts());
        expect(result.current.isSitAndGo).toBe(false);
        expect(result.current.places).toEqual([]);
        expect(result.current.prizePool).toBeNull();
    });

    it("returns empty places when gameState is missing", () => {
        setContext(undefined, GameFormat.SIT_AND_GO);
        const { result } = renderHook(() => useSitAndGoPayouts());
        expect(result.current.isSitAndGo).toBe(true);
        expect(result.current.places).toEqual([]);
        expect(result.current.prizePool).toBeNull();
    });

    it("returns empty places when payouts[] is absent (not yet resolved)", () => {
        setContext(buildState(undefined));
        const { result } = renderHook(() => useSitAndGoPayouts());
        expect(result.current.isSitAndGo).toBe(true);
        expect(result.current.places).toEqual([]);
        expect(result.current.prizePool).toBeNull();
    });

    it("heads-up (single 100% payout) — reads state.payouts", () => {
        setContext(buildState([{ place: 1, amount: "20000000" }]));
        const { result } = renderHook(() => useSitAndGoPayouts());

        expect(result.current.prizePool).toBe("20000000");
        expect(result.current.places).toEqual([
            { place: 1, payout: "20000000" }
        ]);
    });

    it("top-2 structure — passes through absolute amounts, derives the prize pool", () => {
        setContext(buildState([
            { place: 1, amount: "39000000" },
            { place: 2, amount: "21000000" }
        ]));
        const { result } = renderHook(() => useSitAndGoPayouts());

        expect(result.current.prizePool).toBe("60000000");
        expect(result.current.places.map(p => p.payout)).toEqual(["39000000", "21000000"]);
    });

    it("top-3 structure — the reported 6-max bug now shows all three places", () => {
        setContext(buildState([
            { place: 1, amount: "36000000" },
            { place: 2, amount: "18000000" },
            { place: 3, amount: "6000000" }
        ]));
        const { result } = renderHook(() => useSitAndGoPayouts());

        expect(result.current.prizePool).toBe("60000000");
        expect(result.current.places.map(p => p.place)).toEqual([1, 2, 3]);
        expect(result.current.places.map(p => p.payout)).toEqual(["36000000", "18000000", "6000000"]);
    });

    it("9 players: passes through the absolute amounts from the PVM", () => {
        setContext(buildState([
            { place: 1, amount: "45000000" },
            { place: 2, amount: "27000000" },
            { place: 3, amount: "18000000" }
        ]));
        const { result } = renderHook(() => useSitAndGoPayouts());

        expect(result.current.prizePool).toBe("90000000");
        expect(result.current.places.map(p => p.payout)).toEqual(["45000000", "27000000", "18000000"]);
    });

    it("does not recompute a curve — it shows exactly what the PVM emitted (drift-to-first)", () => {
        // A pool that doesn't divide evenly: the PVM already credited the drift to
        // 1st place. The hook must surface those exact amounts, not re-split.
        setContext(buildState([
            { place: 1, amount: "4" }, // 3 base + 1 drift
            { place: 2, amount: "2" }
        ]));
        const { result } = renderHook(() => useSitAndGoPayouts());

        expect(result.current.prizePool).toBe("6");
        expect(result.current.places.map(p => p.payout)).toEqual(["4", "2"]);
    });
});
