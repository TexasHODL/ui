import { renderHook, waitFor } from "@testing-library/react";
import { useIndexerApi } from "../../context/IndexerApiContext";
import type { PlayerListItem } from "../../types/players";
import { usePlayersDirectory } from "./usePlayersDirectory";

jest.mock("../../context/IndexerApiContext", () => ({ useIndexerApi: jest.fn() }));

const getPlayers = jest.fn();
(useIndexerApi as jest.Mock).mockReturnValue({ getPlayers });

const ALPHA = "b521alpha";
const BETA = "b521beta";
const GAMMA = "b521gamma";

const row = (player_address: string, net_profit: number, total_hands = 1): PlayerListItem => ({
    player_address,
    vip_tier: "bronze",
    rakeback_pct: 0,
    total_hands,
    total_actions: 1,
    net_profit,
    total_rake_contributed: 0
});

const directory = (rows: PlayerListItem[]) => ({ data: rows, pagination: { limit: 1000, offset: 0, total: rows.length } });

const params = { search: "", sort: "net_profit" as const, order: "desc" as const, limit: 20, offset: 0 };

beforeEach(() => {
    getPlayers.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
    (useIndexerApi as jest.Mock).mockReturnValue({ getPlayers });
});

afterEach(() => {
    jest.restoreAllMocks();
});

test("sorts and pages by the indexer's net profit, without chain overlays", async () => {
    getPlayers.mockResolvedValue(directory([row(ALPHA, -1000, 10), row(BETA, 50, 4), row(GAMMA, 10, 20)]));

    const initialProps: { order: "asc" | "desc"; offset: number } = { order: "desc", offset: 0 };
    const { result, rerender } = renderHook(
        (props: { order: "asc" | "desc"; offset: number }) => usePlayersDirectory({ ...params, order: props.order, limit: 2, offset: props.offset }),
        { initialProps }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.total).toBe(3);
    expect(result.current.players.map(player => [player.player_address, player.net_profit, player.total_hands])).toEqual([
        [BETA, 50, 4],
        [GAMMA, 10, 20]
    ]);
    expect(result.current.error).toBeNull();

    const playerCalls = getPlayers.mock.calls.length;
    rerender({ order: "asc", offset: 0 });
    await waitFor(() => expect(result.current.players[0]?.player_address).toBe(ALPHA));
    expect(result.current.players.map(player => player.net_profit)).toEqual([-1000, 10]);
    expect(getPlayers).toHaveBeenCalledTimes(playerCalls);
});

test("sorts the directory by the indexer's total_hands", async () => {
    getPlayers.mockResolvedValue(directory([row(ALPHA, 1, 10), row(BETA, 9, 4), row(GAMMA, 3, 20)]));

    const { result } = renderHook(() => usePlayersDirectory({ ...params, sort: "total_hands", order: "desc", limit: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.players.map(player => [player.player_address, player.total_hands])).toEqual([
        [GAMMA, 20],
        [ALPHA, 10],
        [BETA, 4]
    ]);
});

test("a failed indexer query surfaces the error and leaves the list empty", async () => {
    getPlayers.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => usePlayersDirectory({ ...params, limit: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.players).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBe("offline");
});
