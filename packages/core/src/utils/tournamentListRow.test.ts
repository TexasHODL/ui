import { lobbyTournamentAction, lobbyTournamentStatus, tournamentListRow } from "./tournamentListRow";
import type { TournamentLobbyCard } from "./tournamentLobby";

const card = (over: Partial<TournamentLobbyCard>): TournamentLobbyCard =>
    ({
        tournamentId: "0xface4d5c",
        phase: "running",
        registered: 27,
        maxEntrants: 27,
        runnersLeft: 12,
        cost: { gross: 1_000_000n, entryFee: 0n, protocolCut: 100_000n, net: 900_000n },
        ...over
    }) as TournamentLobbyCard;

describe("tournamentListRow", () => {
    it("shows runners out of the cap while registering", () => {
        const row = tournamentListRow(card({ phase: "open", registered: 27, maxEntrants: 40 }));
        expect(row.runners).toBe("27 / 40");
        expect(row.buyIn).toBe("$1.00");
        expect(row.status).toBe("Registering");
    });

    it("shows how many are still in while running, and the starting field when finished", () => {
        expect(tournamentListRow(card({ phase: "running", registered: 7, runnersLeft: 5 })).runners).toBe("5 left of 7");
        expect(tournamentListRow(card({ phase: "finished", registered: 7, runnersLeft: 1 })).runners).toBe("7 entrants");
        expect(tournamentListRow(card({ phase: "cancelled", registered: 3, runnersLeft: 0 })).runners).toBe("3 entrants");
    });

    it("links a running or finished tournament to its own page", () => {
        expect(tournamentListRow(card({ phase: "running" })).action).toEqual({ label: "View", url: "/tournament/0xface4d5c" });
        expect(tournamentListRow(card({ phase: "finished" })).action).toEqual({ label: "View", url: "/tournament/0xface4d5c" });
    });

    it("sends an open tournament to its own page to register, and says when it is full or cancelled", () => {
        expect(tournamentListRow(card({ phase: "open" })).action).toEqual({ label: "Register", url: "/tournament/0xface4d5c" });
        expect(tournamentListRow(card({ phase: "full" })).action.label).toBe("Full");
        expect(tournamentListRow(card({ phase: "cancelled" })).action.label).toBe("Cancelled");
    });
});

describe("lobbyTournamentStatus", () => {
    it("uses the same words as sit-and-go rows, including Finished without a winner", () => {
        expect(lobbyTournamentStatus(card({ phase: "open" }))).toBe("Registering");
        expect(lobbyTournamentStatus(card({ phase: "starting" }))).toBe("Starting \u00b7 any moment");
        expect(lobbyTournamentStatus(card({ phase: "running" }))).toBe("Started");
        expect(lobbyTournamentStatus(card({ phase: "finished" }))).toBe("Finished");
        expect(lobbyTournamentStatus(card({ phase: "finished", winnerAddress: "b521s8aug28r6vned2xm767xhgrkg90wfef2hfg4mg" }))).toBe("Finished");
        expect(lobbyTournamentStatus(card({ phase: "cancelled" }))).toBe("Cancelled: not enough players");
        expect(lobbyTournamentStatus(card({ phase: "full" }))).toBe("Full");
        expect(lobbyTournamentStatus(card({ phase: "open", startsAtMs: 3_600_000 }), 0)).toBe("Registering \u00b7 starts in 1:00:00");
        expect(
            lobbyTournamentStatus(card({ phase: "open", startsAtMs: 3_600_000, minEntrants: 4, registered: 3, atRiskOfCancelling: true }), 0)
        ).toBe("Registering \u00b7 starts in 1:00:00 \u00b7 1 more needed or it cancels");
    });
});

describe("lobbyTournamentAction", () => {
    it("sends a player who is in a running tournament to their table", () => {
        expect(lobbyTournamentAction(card({ phase: "running", myTable: { gameId: "0xface4d5c-t3", number: 3 } }))).toEqual({
            label: "Take my seat",
            url: "/tournament/0xface4d5c/table/3",
            seatedAt: 3
        });
    });

    it("keeps Register and View when the viewer has no seat", () => {
        expect(lobbyTournamentAction(card({ phase: "open" }))).toEqual({ label: "Register", url: "/tournament/0xface4d5c" });
        expect(lobbyTournamentAction(card({ phase: "running" }))).toEqual({ label: "View", url: "/tournament/0xface4d5c" });
    });
});
