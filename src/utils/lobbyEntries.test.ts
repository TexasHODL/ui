import { GameFormat } from "@block52/poker-vm-sdk";
import type { GameWithFormat } from "./convertUtils";
import { filterLobbyTournamentCards, sortLobbyEntries, type LobbyEntry } from "./lobbyEntries";
import type { TournamentLobbyCard } from "@block52/poker-ui-core/utils/tournamentLobby";

const game = (over: Partial<GameWithFormat> & Pick<GameWithFormat, "gameId">): GameWithFormat =>
    ({
        name: over.gameId,
        creator: "x",
        gameFormat: GameFormat.CASH,
        currentPlayers: 1,
        maxPlayers: 6,
        minPlayers: 2,
        minBuyIn: "1000000",
        maxBuyIn: "1000000",
        smallBlind: "10000",
        bigBlind: "20000",
        ...over
    }) as GameWithFormat;

const card = (over: Partial<TournamentLobbyCard> & Pick<TournamentLobbyCard, "tournamentId" | "phase">): TournamentLobbyCard =>
    ({
        registered: 3,
        maxEntrants: 27,
        minEntrants: 2,
        startsAtMs: 2_000,
        cost: { gross: 1_000_000n, entryFee: 0n, protocolCut: 0n, net: 1_000_000n },
        ...over
    }) as TournamentLobbyCard;

const entry = (item: LobbyEntry): LobbyEntry => item;

describe("filterLobbyTournamentCards", () => {
    const open = card({ tournamentId: "0xopen", phase: "open", name: "All In" });
    const finished = card({ tournamentId: "0xfin", phase: "finished", name: "Bitcoin Roulette" });

    it("hides finished and running cards when only open tables are requested", () => {
        expect(filterLobbyTournamentCards([open, finished], { search: "", openOnly: true })).toEqual([open]);
    });

    it("matches a generated or stored name, or the tournament id", () => {
        expect(filterLobbyTournamentCards([open, finished], { search: "roulette", openOnly: false }).map(c => c.tournamentId)).toEqual(["0xfin"]);
        expect(filterLobbyTournamentCards([open, finished], { search: "0xopen", openOnly: false }).map(c => c.tournamentId)).toEqual(["0xopen"]);
    });

    it("My tables keeps events the viewer created or is registered in", () => {
        const created = card({ tournamentId: "0xmine", phase: "open", creator: "alice" });
        const registered = card({ tournamentId: "0xreg", phase: "running", creator: "bob", isRegistered: true });
        const other = card({ tournamentId: "0xother", phase: "open", creator: "bob" });
        expect(
            filterLobbyTournamentCards([created, registered, other], { search: "", openOnly: false, ownedOnly: true, viewer: "alice" }).map(c => c.tournamentId)
        ).toEqual(["0xmine", "0xreg"]);
    });

    it("treasury filter keeps events created by the treasury address", () => {
        const ours = card({ tournamentId: "0xours", phase: "open", creator: "treasury" });
        const other = card({ tournamentId: "0xother", phase: "open", creator: "bob" });
        expect(filterLobbyTournamentCards([ours, other], { search: "", openOnly: false, treasuryOnly: true, treasuryAddress: "treasury" }).map(c => c.tournamentId)).toEqual([
            "0xours"
        ]);
        expect(filterLobbyTournamentCards([ours, other], { search: "", openOnly: false, treasuryOnly: true }).map(c => c.tournamentId)).toEqual([]);
    });
});

describe("sortLobbyEntries", () => {
    const nowMs = 1_000;
    const openMtt = entry({ kind: "mtt", card: card({ tournamentId: "0xopen", phase: "open", startsAtMs: 5_000, registered: 1 }) });
    const laterOpenMtt = entry({ kind: "mtt", card: card({ tournamentId: "0xlater", phase: "open", startsAtMs: 9_000, registered: 2 }) });
    const finishedMtt = entry({ kind: "mtt", card: card({ tournamentId: "0xfin", phase: "finished", registered: 7 }) });
    const runningMtt = entry({ kind: "mtt", card: card({ tournamentId: "0xrun", phase: "running", registered: 12 }) });
    const joinableCash = entry({ kind: "game", game: game({ gameId: "cash-open", currentPlayers: 2, maxPlayers: 6 }) });
    const fullCash = entry({ kind: "game", game: game({ gameId: "cash-full", currentPlayers: 6, maxPlayers: 6 }) });
    const startedSng = entry({
        kind: "game",
        game: game({ gameId: "sng-started", gameFormat: GameFormat.SIT_AND_GO, currentPlayers: 6, maxPlayers: 6, scheduledStartTime: 500 })
    });

    it("puts open MTT registration and joinable tables above Started, Finished, and full tables", () => {
        const sorted = sortLobbyEntries([finishedMtt, fullCash, startedSng, joinableCash, runningMtt, laterOpenMtt, openMtt], {
            sort: "activity",
            progress: { "sng-started": { mark: "started" } },
            nowMs
        });
        expect(sorted.map(item => (item.kind === "mtt" ? item.card.tournamentId : item.game.gameId))).toEqual([
            "0xopen",
            "0xlater",
            "cash-open",
            "0xrun",
            "0xfin",
            "cash-full",
            "sng-started"
        ]);
    });

    it("keeps buy-in as the primary key when sorting by buy-in, then available-first", () => {
        const cheapFinished = entry({
            kind: "mtt",
            card: card({ tournamentId: "cheap-fin", phase: "finished", cost: { gross: 10_000n, entryFee: 0n, protocolCut: 0n, net: 10_000n } })
        });
        const expensiveOpen = entry({
            kind: "mtt",
            card: card({
                tournamentId: "pricey-open",
                phase: "open",
                cost: { gross: 2_000_000n, entryFee: 0n, protocolCut: 0n, net: 2_000_000n }
            })
        });
        const sorted = sortLobbyEntries([expensiveOpen, cheapFinished], { sort: "buyin", nowMs });
        expect(sorted.map(item => (item.kind === "mtt" ? item.card.tournamentId : item.game.gameId))).toEqual(["cheap-fin", "pricey-open"]);
    });
});
