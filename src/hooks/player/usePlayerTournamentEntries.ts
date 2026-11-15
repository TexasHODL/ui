import { useEffect, useState } from "react";
import { httpErrorMessage } from "../../apis/HTTPClient";
import { useCosmosApi } from "../../context/CosmosApiContext";
import { hasContent, hasValue } from "../../utils/guards";
import { mapWithConcurrency } from "../../utils/pagedFetch";
import { isPrizeClaimAddress } from "../../utils/playerPrizeClaims";
import {
    earliestRegistrations,
    readTournamentRecord,
    tournamentEntryFromRegistration,
    tournamentRegisteredQuery,
    tournamentRegistrationsFromTxSearch,
    type PlayerTournamentEntry
} from "../../utils/playerTournamentEntries";

interface UsePlayerTournamentEntriesResult {
    entries: PlayerTournamentEntry[];
    loading: boolean;
    /** Set when the registration query failed. Entries stay empty so the indexer rows still show. */
    error: string | null;
}

interface EntryState {
    address: string;
    entries: PlayerTournamentEntry[];
    error: string | null;
}

/**
 * Multi-table tournaments one player registered for, from the configured node.
 *
 * `tournament_registered.player='<addr>'` on the node's transaction search
 * (the REST GetTxsEvent the rest of the profile uses) gives the tournament id,
 * the register height, and the buy-in plus entry fee. Each id is then read
 * with `getTournament`. A failed query leaves the list empty.
 */
export function usePlayerTournamentEntries(address: string | undefined): UsePlayerTournamentEntriesResult {
    const cosmosApi = useCosmosApi();
    const [state, setState] = useState<EntryState | null>(null);
    const player = hasContent(address) ? address.toLowerCase() : undefined;

    useEffect(() => {
        if (!hasContent(player)) return;
        if (!isPrizeClaimAddress(player)) {
            setState({ address: player, entries: [], error: "Invalid player address" });
            return;
        }
        let cancelled = false;
        cosmosApi
            .getAllTransactionsMatching(tournamentRegisteredQuery(player))
            .then(async response => {
                const registrations = earliestRegistrations(tournamentRegistrationsFromTxSearch(response, player));
                const loaded = await mapWithConcurrency(registrations, 4, async registration => {
                    try {
                        const record = readTournamentRecord(await cosmosApi.getTournament(registration.tournamentId));
                        if (!hasValue(record)) return undefined;
                        return tournamentEntryFromRegistration(registration, record, player);
                    } catch (err) {
                        console.error("Failed to read tournament:", err);
                        return undefined;
                    }
                });
                if (cancelled) return;
                setState({ address: player, entries: loaded.filter(hasValue), error: null });
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Failed to fetch tournament entries:", err);
                setState({ address: player, entries: [], error: httpErrorMessage(err, "Failed to fetch tournament entries") });
            });
        return () => {
            cancelled = true;
        };
    }, [cosmosApi, player]);

    const ready = hasValue(state) && state.address === player;
    return {
        entries: ready ? state.entries : [],
        loading: hasContent(player) && !ready,
        error: ready ? state.error : null
    };
}
