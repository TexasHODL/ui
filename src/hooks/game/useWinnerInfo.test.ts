import { renderHook } from "@testing-library/react";
import { GameFormat } from "@block52/poker-vm-sdk";
import { formatWinAmount, useWinnerInfo } from "./useWinnerInfo";
import { useGameStateContext } from "../../context/GameStateContext";

jest.mock("../../context/GameStateContext");

const mockedUseGameStateContext = useGameStateContext as jest.MockedFunction<typeof useGameStateContext>;

const withState = (state: unknown, gameFormat: GameFormat = GameFormat.CASH) =>
    mockedUseGameStateContext.mockReturnValue({
        gameState: state,
        gameFormat,
        isLoading: false,
        error: null
    } as any);

describe("useWinnerInfo winnerBySeat (#2455)", () => {
    afterEach(() => jest.clearAllMocks());

    it("indexes winners by seat", () => {
        withState({
            winners: [
                { seat: 3, address: "0xa", amount: "100", description: "Full House" },
                { seat: 7, address: "0xb", amount: "50", description: "Two Pair" }
            ],
            players: []
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerBySeat.get(3)?.address).toBe("0xa");
        expect(result.current.winnerBySeat.get(7)?.description).toBe("Two Pair");
        expect(result.current.winnerBySeat.get(1)).toBeUndefined();
        // winnerBySeat is consistent with the array it indexes
        expect(result.current.winnerBySeat.size).toBe(result.current.winnerInfo?.length);
    });

    it("returns an empty map when there are no winners", () => {
        withState({ winners: [], players: [] });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo).toBeNull();
        expect(result.current.winnerBySeat.size).toBe(0);
    });

    it("returns an empty map while loading", () => {
        mockedUseGameStateContext.mockReturnValue({
            gameState: undefined,
            isLoading: true,
            error: null
        } as any);

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerBySeat.size).toBe(0);
    });
});


describe("winner seat is 1-based (no Seat 0 banner)", () => {
    afterEach(() => jest.clearAllMocks());

    it("falls back to players[] when winner.seat is 0 (absent stamp)", () => {
        withState({
            winners: [{ seat: 0, address: "0xa", amount: "540000", description: "Trip Tens", cards: ["TD", "TH"] }],
            players: [{ seat: 1, address: "0xa" }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(1);
        expect(result.current.winnerBySeat.get(1)?.description).toBe("Trip Tens");
        expect(result.current.winnerBySeat.get(0)).toBeUndefined();
    });

    it("falls back to players[] when winner.seat is missing", () => {
        withState({
            winners: [{ address: "0xb", amount: "100", description: "Pair of Aces", cards: ["AS", "AH"] }],
            players: [{ seat: 2, address: "0xb" }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(2);
        expect(result.current.winnerBySeat.get(2)?.address).toBe("0xb");
    });

    it("prefers a stamped 1-based winner.seat over players[]", () => {
        withState({
            winners: [{ seat: 3, address: "0xa", amount: "100" }],
            players: [{ seat: 1, address: "0xa" }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(3);
        expect(result.current.winnerBySeat.get(3)?.address).toBe("0xa");
    });
    it("falls back to previousActions when winner left players[] (Leave at END)", () => {
        withState({
            winners: [{ seat: 0, address: "0xWinner", amount: "540000", description: "Trip Tens", cards: ["TD", "TH"] }],
            players: [],
            previousActions: [
                { playerId: "0xWinner", seat: 1, action: "bet", amount: "100000", round: "river", index: 1, timestamp: 0 },
                { playerId: "0xWinner", seat: 1, action: "leave", amount: "800000", round: "end", index: 2, timestamp: 1 }
            ]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(1);
        expect(result.current.winnerBySeat.get(1)?.description).toBe("Trip Tens");
        expect(result.current.winnerBySeat.get(0)).toBeUndefined();
    });

    it("matches previousActions playerId case-insensitively", () => {
        withState({
            winners: [{ seat: 0, address: "0xAbCd", amount: "100", description: "Pair", cards: ["AS", "AH"] }],
            players: [],
            previousActions: [{ playerId: "0xabcd", seat: 2, action: "call", amount: "50", round: "flop", index: 1, timestamp: 0 }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(2);
    });

    it("prefers players[] over previousActions when both resolve", () => {
        withState({
            winners: [{ seat: 0, address: "0xa", amount: "100" }],
            players: [{ seat: 4, address: "0xa" }],
            previousActions: [{ playerId: "0xa", seat: 9, action: "bet", amount: "1", round: "flop", index: 1, timestamp: 0 }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(4);
    });

    it("stays unresolved only when seat cannot be known from stamp, players, or actions", () => {
        withState({
            winners: [{ seat: 0, address: "0xorphan", amount: "540000", description: "Trip Tens", cards: ["TD", "TH"] }],
            players: [],
            previousActions: [{ playerId: "0xother", seat: 1, action: "bet", amount: "1", round: "flop", index: 1, timestamp: 0 }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.seat).toBe(0);
        expect(result.current.winnerBySeat.get(0)?.description).toBe("Trip Tens");
    });

});

describe("win amounts use the table's units (ui#727)", () => {
    afterEach(() => jest.clearAllMocks());

    it("formats chips for SNG and tournament, USDC for cash", () => {
        expect(formatWinAmount("120", true)).toBe("120 chips");
        expect(formatWinAmount("12400", true)).toBe(`${(12400).toLocaleString()} chips`);
        expect(formatWinAmount("400000", false)).toBe("0.40");
    });

    it("an SNG win reads in chips, not the cash-style 0.00", () => {
        withState({ winners: [{ seat: 3, address: "0xa", amount: "120" }], players: [] }, GameFormat.SIT_AND_GO);

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerBySeat.get(3)?.formattedAmount).toBe("120 chips");
    });

    it("a tournament win reads in chips", () => {
        withState({ winners: [{ seat: 1, address: "0xa", amount: "3000" }], players: [] }, GameFormat.TOURNAMENT);

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerBySeat.get(1)?.formattedAmount).toBe(`${(3000).toLocaleString()} chips`);
    });

    it("a cash win keeps the existing USDC format", () => {
        withState({ winners: [{ seat: 2, address: "0xa", amount: "400000" }], players: [] }, GameFormat.CASH);

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerBySeat.get(2)?.formattedAmount).toBe("0.40");
    });
});


describe("winner avatar for floating win banner", () => {
    afterEach(() => jest.clearAllMocks());

    it("carries the player avatar from players[] so the banner can show the NFT", () => {
        withState({
            winners: [{ seat: 2, address: "0xWinner", amount: "150000000", cards: [] }],
            players: [
                {
                    seat: 2,
                    address: "0xWinner",
                    avatar: "nft:eip155:1/erc721:0xabc0000000000000000000000000000000000001/42|ipfs://QmWinnerNft/42"
                }
            ]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.avatar).toBe(
            "nft:eip155:1/erc721:0xabc0000000000000000000000000000000000001/42|ipfs://QmWinnerNft/42"
        );
        expect(result.current.winnerBySeat.get(2)?.avatar).toContain("ipfs://QmWinnerNft/42");
    });

    it("leaves avatar undefined when the player has no NFT payload", () => {
        withState({
            winners: [{ seat: 1, address: "0xPlain", amount: "100" }],
            players: [{ seat: 1, address: "0xPlain" }]
        });

        const { result } = renderHook(() => useWinnerInfo());

        expect(result.current.winnerInfo?.[0]?.avatar).toBeUndefined();
    });
});
