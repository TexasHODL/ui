/**
 * Friendly wording for a failed tournament create / register / unregister tx.
 * The chain's own message is kept so it can still be shown as detail.
 */
export interface TournamentTxError {
    /** Short explanation for the player. */
    message: string;
    /** The chain's (or client's) raw message, when it adds anything the short text does not. */
    detail?: string;
}

const rawOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Map a failed tournament transaction to a short player-facing message plus the raw detail. */
export function tournamentTxError(err: unknown): TournamentTxError {
    const raw = rawOf(err).trim();
    const lower = raw.toLowerCase();

    const friendly = (message: string): TournamentTxError => (raw && raw.toLowerCase() !== message.toLowerCase() ? { message, detail: raw } : { message });

    if (/insufficient funds|insufficient fee|spendable|not enough (funds|balance|coins|tokens)/i.test(lower)) {
        return friendly("Not enough funds in your wallet to pay the buy-in.");
    }
    if (/already registered|already an entrant|already entered/i.test(lower)) {
        return friendly("You are already registered for this tournament.");
    }
    if (/not registered|is not registered|not an entrant/i.test(lower)) {
        return friendly("You are not registered for this tournament.");
    }
    if (/full|max(imum)? entrants|maximum number of entrants|registration is full/i.test(lower)) {
        return friendly("This tournament is full.");
    }
    if (/registration (is )?closed|already started|not registering|registration has (ended|closed)|too late/i.test(lower)) {
        return friendly("Registration is closed.");
    }
    if (/cancelled|canceled/i.test(lower)) {
        return friendly("This tournament has been cancelled.");
    }
    if (raw) {
        return { message: "The transaction could not be completed.", detail: raw };
    }
    return { message: "The transaction could not be completed." };
}
