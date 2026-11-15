import { renderHook, waitFor } from "@testing-library/react";
import { usePlayerTournamentEntries } from "./usePlayerTournamentEntries";

const mockApi = { getAllTransactionsMatching: jest.fn(), getTournament: jest.fn() };
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: () => mockApi }));

const PLAYER = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const TID = "0x275a79b9258009e0a1f4f4f4232cefe25262765f0a5c7c3a86040885ffec5187";

const search = {
    tx_responses: [
        {
            code: 0,
            height: "1059332",
            txhash: "REG",
            events: [
                {
                    type: "tournament_registered",
                    attributes: [
                        { key: "tournament_id", value: TID },
                        { key: "player", value: PLAYER },
                        { key: "buy_in", value: "2000000" },
                        { key: "entry_fee", value: "200000" }
                    ]
                }
            ]
        }
    ]
};

const tournament = {
    tournament: JSON.stringify({
        tournamentId: TID,
        status: "finished",
        level: 1,
        options: { buyIn: "2000000", entryFee: "200000", blindStructure: { levels: [] } },
        entrants: [],
        tables: [{ tableId: `${TID}/t1`, ordinal: 1 }],
        results: [{ place: 6, playerId: PLAYER, payout: "0" }],
        prizePool: "0",
        payouts: [],
        seq: 1
    })
};

beforeEach(() => {
    mockApi.getAllTransactionsMatching.mockReset();
    mockApi.getTournament.mockReset();
});

test("reads registrations and each tournament from the configured node", async () => {
    mockApi.getAllTransactionsMatching.mockResolvedValue(search);
    mockApi.getTournament.mockResolvedValue(tournament);
    const { result } = renderHook(() => usePlayerTournamentEntries(PLAYER));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.getAllTransactionsMatching).toHaveBeenCalledWith(`tournament_registered.player='${PLAYER}'`);
    expect(mockApi.getTournament).toHaveBeenCalledWith(TID);
    expect(result.current.entries).toEqual([
        {
            tournamentId: TID,
            registerHeight: 1_059_332,
            buyIn: 2_200_000,
            gameId: `${TID}-t1`,
            status: "finished",
            results: [{ place: 6, playerId: PLAYER, payout: "0" }]
        }
    ]);
    expect(result.current.error).toBeNull();
});

test("a failed registration query leaves entries empty", async () => {
    mockApi.getAllTransactionsMatching.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => usePlayerTournamentEntries(PLAYER));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBe("offline");
});
