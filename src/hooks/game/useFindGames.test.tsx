import { act, renderHook, waitFor } from "@testing-library/react";
import { gameResponseToListItem, useFindGames } from "./useFindGames";
import { isFullGameId, LOBBY_REFRESH_INTERVAL_MS, useLobbyAutoRefresh, useSearchMissRecovery } from "./useLobbyAutoRefresh";

const mockFindGames = jest.fn();
const mockGetGame = jest.fn();
const mockNetworkValue = { currentNetwork: { name: "fixture" } };
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => mockNetworkValue }));
jest.mock("../../utils/cosmos/client", () => ({
    getCosmosClient: () => ({ findGames: mockFindGames, getGame: mockGetGame })
}));

const tableId = "0x4c7b6079bbecf0f2f02b424e9b91c92f1ee7c35bf452f4cd0d9774e9ba6d996c";
const gameOptions = { minBuyIn: "10000", maxBuyIn: "10000", minPlayers: 3, maxPlayers: 4, smallBlind: "10", bigBlind: "20", timeout: 25 };
const listItem = (gameId: string) => ({ gameId, creator: "b521x", format: "cash", variant: "texas-holdem", currentPlayers: 0, gameOptions });
// Shape of /block52/pokerchain/poker/v1/game/{id}: `game` is a JSON string, options nested in gameState.
const gameResponse = {
    game: JSON.stringify({
        gameId: tableId,
        creator: "b521x",
        format: "sit-and-go",
        variant: "texas-holdem",
        gameState: { gameOptions, players: [{}, {}, {}] }
    })
};

const setVisibility = (state: "visible" | "hidden") =>
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });

beforeEach(() => {
    jest.clearAllMocks();
    setVisibility("visible");
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
    jest.useRealTimers();
    (console.error as jest.Mock).mockRestore?.();
});

describe("isFullGameId / gameResponseToListItem", () => {
    it("recognises only 0x + 64 hex ids", () => {
        expect(isFullGameId(tableId)).toBe(true);
        expect(isFullGameId(` ${tableId.toUpperCase().replace("0X", "0x")} `)).toBe(true);
        expect(isFullGameId(tableId.slice(0, 20))).toBe(false);
        expect(isFullGameId("side-pot")).toBe(false);
    });

    it("flattens the single-game response into a list item", () => {
        const item = gameResponseToListItem(gameResponse);
        expect(item).toMatchObject({ gameId: tableId, format: "sit-and-go", currentPlayers: 3, gameOptions });
        expect(item).not.toHaveProperty("gameState");
        expect(gameResponseToListItem({})).toBeNull();
    });
});

describe("useFindGames", () => {
    it("silent refetch keeps rows on screen (no loading flicker)", async () => {
        mockFindGames.mockResolvedValueOnce([listItem("a")]);
        const { result } = renderHook(() => useFindGames());
        await waitFor(() => expect(result.current.games).toHaveLength(1));

        let resolve: (v: unknown) => void = () => undefined;
        mockFindGames.mockReturnValueOnce(new Promise(r => { resolve = r; }));
        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = result.current.refetch({ silent: true }); });
        expect(result.current.isLoading).toBe(false);
        expect(result.current.games.map(g => g.gameId)).toEqual(["a"]);
        await act(async () => { resolve([listItem("a"), listItem("b")]); await pending; });
        expect(result.current.games.map(g => g.gameId)).toEqual(["a", "b"]);
    });

    it("does not stack requests while one is in flight", async () => {
        let resolve: (v: unknown) => void = () => undefined;
        mockFindGames.mockReturnValue(new Promise(r => { resolve = r; }));
        const { result } = renderHook(() => useFindGames());
        act(() => {
            void result.current.refetch({ silent: true });
            void result.current.refetch({ silent: true });
        });
        expect(mockFindGames).toHaveBeenCalledTimes(1);
        await act(async () => { resolve([]); });
    });

    it("a failed background poll keeps the list and shows no error", async () => {
        mockFindGames.mockResolvedValueOnce([listItem("a")]);
        const { result } = renderHook(() => useFindGames());
        await waitFor(() => expect(result.current.games).toHaveLength(1));
        mockFindGames.mockRejectedValueOnce(new Error("network"));
        await act(async () => { await result.current.refetch({ silent: true }); });
        expect(result.current.error).toBeNull();
        expect(result.current.games).toHaveLength(1);
    });

    it("looks a table up directly by id and keeps it across list refreshes", async () => {
        mockFindGames.mockResolvedValue([listItem("a")]);
        mockGetGame.mockResolvedValue(gameResponse);
        const { result } = renderHook(() => useFindGames());
        await waitFor(() => expect(result.current.games).toHaveLength(1));
        let found: unknown;
        await act(async () => { found = await result.current.lookupGame(tableId); });
        expect(mockGetGame).toHaveBeenCalledWith(tableId);
        expect(found).toMatchObject({ gameId: tableId, currentPlayers: 3, maxPlayers: 4 });
        await act(async () => { await result.current.refetch({ silent: true }); });
        expect(result.current.games.map(g => g.gameId)).toEqual(["a", tableId]);
    });

    it("lookup of an unknown id returns null without throwing", async () => {
        mockFindGames.mockResolvedValue([]);
        mockGetGame.mockRejectedValue(new Error("not found"));
        const { result } = renderHook(() => useFindGames());
        let found: unknown = "x";
        await act(async () => { found = await result.current.lookupGame(tableId); });
        expect(found).toBeNull();
    });
});

describe("useLobbyAutoRefresh", () => {
    it("polls silently every interval while visible and pauses while hidden", () => {
        jest.useFakeTimers();
        const refetch = jest.fn().mockResolvedValue(undefined);
        const { unmount } = renderHook(() => useLobbyAutoRefresh(refetch));
        act(() => { jest.advanceTimersByTime(LOBBY_REFRESH_INTERVAL_MS); });
        expect(refetch).toHaveBeenCalledTimes(1);
        expect(refetch).toHaveBeenCalledWith({ silent: true });
        setVisibility("hidden");
        act(() => { jest.advanceTimersByTime(LOBBY_REFRESH_INTERVAL_MS * 3); });
        expect(refetch).toHaveBeenCalledTimes(1);
        unmount();
        setVisibility("visible");
        act(() => { jest.advanceTimersByTime(LOBBY_REFRESH_INTERVAL_MS * 3); });
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("refetches when the tab becomes visible or the window regains focus", () => {
        const refetch = jest.fn().mockResolvedValue(undefined);
        renderHook(() => useLobbyAutoRefresh(refetch));
        setVisibility("hidden");
        act(() => { document.dispatchEvent(new Event("visibilitychange")); });
        expect(refetch).not.toHaveBeenCalled();
        setVisibility("visible");
        act(() => { document.dispatchEvent(new Event("visibilitychange")); });
        act(() => { window.dispatchEvent(new Event("focus")); });
        expect(refetch).toHaveBeenCalledTimes(2);
    });
});

describe("useSearchMissRecovery", () => {
    const setup = (search: string, hasResults = false, isLoading = false) => {
        const refetch = jest.fn().mockResolvedValue(undefined);
        const lookup = jest.fn().mockResolvedValue(null);
        const hook = renderHook(
            ({ s, r, l }) => useSearchMissRecovery(s, r, l, refetch, lookup),
            { initialProps: { s: search, r: hasResults, l: isLoading } }
        );
        return { refetch, lookup, ...hook };
    };

    it("refetches once for a name search that matches nothing", async () => {
        const { refetch, lookup, rerender } = setup("side-pot");
        await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
        rerender({ s: "side-pot", r: false, l: false });
        rerender({ s: "side-pot ", r: false, l: false });
        expect(refetch).toHaveBeenCalledTimes(1);
        expect(lookup).not.toHaveBeenCalled();
    });

    it("looks up a full table id directly after the refetch", async () => {
        const { refetch, lookup } = setup(tableId);
        await waitFor(() => expect(lookup).toHaveBeenCalledWith(tableId));
        expect(refetch).toHaveBeenCalledWith({ silent: true });
    });

    it("does nothing with results, an empty search, or while loading", () => {
        expect(setup(tableId, true).refetch).not.toHaveBeenCalled();
        expect(setup("", false).refetch).not.toHaveBeenCalled();
        expect(setup(tableId, false, true).refetch).not.toHaveBeenCalled();
    });
});