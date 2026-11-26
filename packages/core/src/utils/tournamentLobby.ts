/**
 * Multi-table tournament lobby (ui#980 slices 2-3, poker-vm#2613).
 *
 * Pure, unit-tested logic behind the /tournaments page: reading the chain's
 * tournament state, finding which tournaments exist, and turning one into the
 * numbers and flags a lobby card shows.
 *
 * SDK GAP (block52/poker-vm sdk 1.24.0): the SDK has the TournamentStatus and
 * TournamentEntrantStatus types but not the engine's TournamentStateDTO, a
 * `getTournament` query, or a list query. {@link TournamentStateDTO} below is
 * therefore the narrowest read of `GET /block52/pokerchain/poker/v1/tournament/{id}`
 * the lobby needs, and {@link tournamentIdsFromTxSearch} finds tournaments through
 * the `tournament_created` event until the chain has a list query. Replace both
 * with the SDK's when it ships them.
 */
import {
    TOURNAMENT_ENTRANT_STATUSES,
    TOURNAMENT_STATUSES,
    expandBlindLevel,
    resolveBlindPreset,
    type BlindStructureDTO,
    type TournamentEntrantStatus,
    type TournamentStatus
} from "@block52/poker-vm-sdk";
import { hasValue, isNullish, isNumber, isRecord, isString } from "@block52/ui-sdk/helpers";
import { describeAnteSchedule } from "./anteRule";
import { gameIdFromTableId } from "./tournamentFollow";
import { formatRunningLateRegistration, formatTournamentLateRegistration, lateRegistrationWindow } from "./tournamentLateRegistration";

export interface TournamentEntrantView {
    address: string;
    status: TournamentEntrantStatus;
    tableId?: string;
}

export interface TournamentOptionsView {
    /** Gross buy-in per entrant, micro-USDC string. */
    buyIn: string;
    /** Flat entry fee inside the buy-in, paid to the creator, micro-USDC string (absent = none). */
    entryFee?: string;
    /** Protocol cut in basis points, set by the chain at creation. */
    protocolFeeBps?: number;
    startingStack: string;
    seatsPerTable: number;
    minEntrants: number;
    maxEntrants: number;
    /** Scheduled start, unix MILLISECONDS (the create message carries seconds). */
    startTime: number;
    blindStructure: BlindStructureDTO;
    actionTimeoutSeconds: number;
    /** Optional custom name if the engine ever stores one. */
    name?: string;
    /** Blind levels late registration stays open; 0/absent = off (ui#1000). Optional until the chain emits it (pokerchain#478). */
    lateRegistrationLevels?: number;
}

/** What the lobby reads of the engine's TournamentStateDTO. */
export interface TournamentResultView {
    place: number;
    playerId: string;
    /** Micro-USDC string; "0" outside the paid places. */
    payout: string;
}

export interface TournamentStateDTO {
    tournamentId: string;
    status: TournamentStatus;
    /** Optional custom name if the engine ever stores one. */
    name?: string;
    options: TournamentOptionsView;
    entrants: TournamentEntrantView[];
    /** Micro-USDC string. "0" until the tournament starts; the lobby projects it while registering. */
    prizePool: string;
    /** Final places when the engine has written them; place 1 is present only once the tournament is over. */
    results?: TournamentResultView[];
    /** Epoch ms when the tournament actually started, if the chain has written it. */
    startedAt?: number;
    /** Epoch ms when the current (or last) blind level started, if the chain has written it. */
    levelStartTime?: number;
    /** Epoch ms when the tournament finished, if the engine ever writes one. */
    finishedAt?: number;
    /** Alias some engine builds may use instead of finishedAt. */
    endedAt?: number;
}

export interface TournamentRecord {
    state: TournamentStateDTO;
    /** The creator's address (the chain stores it beside the state). */
    creator: string;
}

const MICRO = /^[0-9]+$/;

function requireString(value: unknown, name: string): string {
    if (!isString(value)) throw new Error(`tournament ${name} must be a string`);
    return value;
}

function requireMicro(value: unknown, name: string): string {
    const s = requireString(value, name);
    if (!MICRO.test(s)) throw new Error(`tournament ${name} must be a non-negative integer string, got "${s}"`);
    return s;
}

function requireInt(value: unknown, name: string): number {
    if (!isNumber(value) || !Number.isInteger(value)) throw new Error(`tournament ${name} must be an integer`);
    return value;
}

/** Optional positive epoch ms; absent or 0 is undefined (the chain may omit these). */
function optionalEpochMs(value: unknown, name: string): number | undefined {
    if (isNullish(value)) return undefined;
    const ms = requireInt(value, name);
    return ms > 0 ? ms : undefined;
}

function isTournamentStatus(value: string): value is TournamentStatus {
    return TOURNAMENT_STATUSES.some(s => s === value);
}

function isEntrantStatus(value: string): value is TournamentEntrantStatus {
    return TOURNAMENT_ENTRANT_STATUSES.some(s => s === value);
}

function parseEntrant(raw: unknown): TournamentEntrantView {
    if (!isRecord(raw)) throw new Error("tournament entrant must be an object");
    const status = requireString(raw.status, "entrant status");
    if (!isEntrantStatus(status)) throw new Error(`unknown tournament entrant status "${status}"`);
    return {
        address: requireString(raw.address, "entrant address"),
        status,
        ...(isString(raw.tableId) && raw.tableId !== "" ? { tableId: raw.tableId } : {})
    };
}

function optionalName(value: unknown): string | undefined {
    if (!isString(value)) return undefined;
    const name = value.trim();
    return name === "" ? undefined : name;
}

function parseBlindStructure(raw: unknown): BlindStructureDTO {
    if (!isRecord(raw)) throw new Error("tournament options.blindStructure must be an object");
    // The structure is the SDK's own BlindStructureDTO, written by the engine; the lobby only displays it.
    return raw as unknown as BlindStructureDTO;
}

/** Validates the engine's TournamentStateDTO JSON. Throws on a malformed state; the chain must provide every field (no defaults). */
export function parseTournamentState(raw: unknown): TournamentStateDTO {
    if (!isRecord(raw)) throw new Error("tournament state must be an object");
    const status = requireString(raw.status, "status");
    if (!isTournamentStatus(status)) throw new Error(`unknown tournament status "${status}"`);
    const o = raw.options;
    if (!isRecord(o)) throw new Error("tournament options must be an object");
    if (!Array.isArray(raw.entrants)) throw new Error("tournament entrants must be an array");
    const options: TournamentOptionsView = {
        buyIn: requireMicro(o.buyIn, "options.buyIn"),
        ...(isNullish(o.entryFee) ? {} : { entryFee: requireMicro(o.entryFee, "options.entryFee") }),
        ...(isNullish(o.protocolFeeBps) ? {} : { protocolFeeBps: requireInt(o.protocolFeeBps, "options.protocolFeeBps") }),
        startingStack: requireMicro(o.startingStack, "options.startingStack"),
        seatsPerTable: requireInt(o.seatsPerTable, "options.seatsPerTable"),
        minEntrants: requireInt(o.minEntrants, "options.minEntrants"),
        maxEntrants: requireInt(o.maxEntrants, "options.maxEntrants"),
        startTime: requireInt(o.startTime, "options.startTime"),
        blindStructure: parseBlindStructure(o.blindStructure),
        actionTimeoutSeconds: requireInt(o.actionTimeoutSeconds, "options.actionTimeoutSeconds"),
        ...(optionalName(o.name) ? { name: optionalName(o.name) } : {}),
        ...(isNullish(o.lateRegistrationLevels) ? {} : { lateRegistrationLevels: requireInt(o.lateRegistrationLevels, "options.lateRegistrationLevels") })
    };
    const name = optionalName(raw.name) ?? options.name;
    const startedAt = optionalEpochMs(raw.startedAt, "startedAt");
    const levelStartTime = optionalEpochMs(raw.levelStartTime, "levelStartTime");
    const finishedAt = optionalEpochMs(raw.finishedAt, "finishedAt");
    const endedAt = optionalEpochMs(raw.endedAt, "endedAt");
    return {
        tournamentId: requireString(raw.tournamentId, "tournamentId"),
        status,
        ...(name ? { name } : {}),
        options,
        entrants: raw.entrants.map(parseEntrant),
        prizePool: requireMicro(raw.prizePool, "prizePool"),
        ...(isNullish(raw.results) ? {} : { results: parseResults(raw.results) }),
        ...(isNullish(startedAt) ? {} : { startedAt }),
        ...(isNullish(levelStartTime) ? {} : { levelStartTime }),
        ...(isNullish(finishedAt) ? {} : { finishedAt }),
        ...(isNullish(endedAt) ? {} : { endedAt })
    };
}

function parseResults(raw: unknown): TournamentResultView[] {
    if (!Array.isArray(raw)) throw new Error("tournament results must be an array");
    return raw.map((item, index) => {
        if (!isRecord(item)) throw new Error(`tournament results[${index}] must be an object`);
        return {
            place: requireInt(item.place, `results[${index}].place`),
            playerId: requireString(item.playerId, `results[${index}].playerId`),
            payout: isNullish(item.payout) ? "0" : requireMicro(item.payout, `results[${index}].payout`)
        };
    });
}

/** The address that finished 1st, once results include place 1. */
export function tournamentWinnerAddress(state: Pick<TournamentStateDTO, "results">): string | undefined {
    const first = state.results?.find(result => result.place === 1);
    return first?.playerId;
}

/** Parses the Tournament query response: `{ tournament: "<TournamentStateDTO JSON>", creator }`. */
export function parseTournamentResponse(raw: unknown): TournamentRecord {
    if (!isRecord(raw)) throw new Error("tournament response must be an object");
    const json = requireString(raw.tournament, "response.tournament");
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error("tournament response.tournament is not valid JSON");
    }
    return { state: parseTournamentState(parsed), creator: requireString(raw.creator, "response.creator") };
}

/**
 * The tournament ids in a CometBFT `tx_search` result for
 * `tournament_created.tournament_id EXISTS`, in the order the search returned
 * them (ask for descending, newest first), without duplicates. Interim discovery
 * until the chain has a list query (SDK gap, see the file header).
 */
export function tournamentIdsFromTxSearch(raw: unknown): string[] {
    if (!isRecord(raw) || !isRecord(raw.result) || !Array.isArray(raw.result.txs)) {
        throw new Error("tx_search response has no result.txs");
    }
    const ids: string[] = [];
    for (const tx of raw.result.txs) {
        if (!isRecord(tx) || !isRecord(tx.tx_result) || !Array.isArray(tx.tx_result.events)) continue;
        for (const event of tx.tx_result.events) {
            if (!isRecord(event) || event.type !== "tournament_created" || !Array.isArray(event.attributes)) continue;
            for (const attr of event.attributes) {
                if (isRecord(attr) && attr.key === "tournament_id" && isString(attr.value) && !ids.includes(attr.value)) ids.push(attr.value);
            }
        }
    }
    return ids;
}

/** The event query that finds every tournament the chain has created. */
export const TOURNAMENT_CREATED_QUERY = "tournament_created.tournament_id EXISTS";

/** The event emitted in the same tx that writes place 1 and settles MTT payouts. */
export const TOURNAMENT_FINISHED_QUERY = "tournament_finished.tournament_id EXISTS";

/** LCD / CometBFT event query for the tx that declared this tournament's winner. */
export function tournamentFinishedQuery(tournamentId: string): string {
    return `tournament_finished.tournament_id='${tournamentId}'`;
}

/**
 * Epoch ms from an ISO / RFC 3339 tx timestamp. Cosmos LCD may include
 * nanoseconds, which Date.parse does not promise to read, so the fraction is
 * cut to milliseconds first (same idea as parseBlockTime).
 */
export function parseTxTimestampMs(timestamp: string): number | undefined {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(timestamp.trim());
    const ms = match
        ? Date.parse(`${match[1]}${match[2] ? match[2].slice(0, 4) : ""}${match[3]}`)
        : Date.parse(timestamp);
    return Number.isNaN(ms) || ms <= 0 ? undefined : ms;
}

/**
 * The time the winner was declared, from a GetTxsEvent / getLatestTransaction
 * page for {@link tournamentFinishedQuery}. Uses the successful tx's `timestamp`
 * (block time). Undefined when the page has no usable tx.
 */
export function endedAtMsFromTournamentFinishedTx(page: unknown): number | undefined {
    if (!isRecord(page) || !Array.isArray(page.tx_responses)) return undefined;
    for (const tx of page.tx_responses) {
        if (!isRecord(tx)) continue;
        if (hasValue(tx.code) && tx.code !== 0 && tx.code !== "0") continue;
        if (!isString(tx.timestamp)) continue;
        const ms = parseTxTimestampMs(tx.timestamp);
        if (!isNullish(ms)) return ms;
    }
    return undefined;
}

/**
 * Look up {@link tournament_finished} timestamps for finished tournaments that
 * are not already in `known`. Failures and empty pages are omitted so the
 * caller can fall back to the lower-bound finish time.
 */
export async function lookupTournamentFinishedAtMs(
    tournamentIds: string[],
    lookup: (query: string) => Promise<unknown>,
    known: ReadonlyMap<string, number> = new Map()
): Promise<Record<string, number>> {
    const pending = tournamentIds.filter(id => id !== "" && !known.has(id));
    const found: Record<string, number> = {};
    const results = await Promise.all(pending.map(async id => {
        try {
            return [id, endedAtMsFromTournamentFinishedTx(await lookup(tournamentFinishedQuery(id)))] as const;
        } catch {
            return [id, undefined] as const;
        }
    }));
    for (const [id, ms] of results) if (!isNullish(ms)) found[id] = ms;
    return found;
}

/** What one entrant pays and what part of it reaches the prize pool. All micro-USDC bigint. */
export interface TournamentEntryCost {
    /** What the player pays to register (the buy-in). */
    gross: bigint;
    /** Inside the buy-in, to the creator. Never refunded. */
    entryFee: bigint;
    /** Inside the buy-in, to validators. Never refunded. */
    protocolCut: bigint;
    /** Gross minus entry fee and protocol cut: escrowed, the prize-pool share, and all that unregistering refunds. */
    net: bigint;
}

/**
 * Mirrors pokerchain `feesFor`: the entry fee and the protocol cut both come OUT
 * of the buy-in (unlike a sit-and-go's owner fee), so the player pays exactly the
 * buy-in and the escrow is what is left.
 */
export function tournamentEntryCost(options: Pick<TournamentOptionsView, "buyIn" | "entryFee" | "protocolFeeBps">): TournamentEntryCost {
    const gross = BigInt(options.buyIn);
    const entryFee = isNullish(options.entryFee) ? 0n : BigInt(options.entryFee);
    const bps = isNullish(options.protocolFeeBps) || options.protocolFeeBps <= 0 ? 0n : BigInt(options.protocolFeeBps);
    const protocolCut = (gross * bps) / 10000n;
    return { gross, entryFee, protocolCut, net: gross - entryFee - protocolCut };
}

export type TournamentLobbyPhase =
    /** Registration is open and the start time has not passed. */
    | "open"
    /** Registration is open and full. */
    | "full"
    /** Start time reached but the chain has not run the start yet (it starts at the next block). */
    | "starting"
    | "running"
    | "finished"
    | "cancelled";

export interface TournamentLobbyCard {
    tournamentId: string;
    creator: string;
    phase: TournamentLobbyPhase;
    status: TournamentStatus;
    registered: number;
    minEntrants: number;
    maxEntrants: number;
    startsAtMs: number;
    /** ms until the start; 0 once passed. */
    msUntilStart: number;
    /** Gross buy-in and the escrowed share, micro-USDC. */
    cost: TournamentEntryCost;
    /** The fixed prize pool once started; the projected pool (registered x net) while registering. */
    prizePoolMicro: bigint;
    prizePoolIsProjected: boolean;
    startingStack: string;
    seatsPerTable: number;
    /** The opening level, e.g. "25/50 blinds, 5 min levels". */
    blindLabel: string;
    /** Registering and under the minimum: the tournament cancels at the start time unless more register. */
    atRiskOfCancelling: boolean;
    /** The viewer is registered (status "registered" or already "playing"). */
    isRegistered: boolean;
    /** The viewer is playing right now: the game id of their table and its number (`<id>-t<n>`). */
    myTable?: { gameId: string; number: number };
    /** Entrants still playing; the same as registered while registration is open. */
    runnersLeft: number;
    /** 1st-place address once the tournament is finished and results include a winner. */
    winnerAddress?: string;
    canRegister: boolean;
    canUnregister: boolean;
    /** Why the viewer cannot register, for the disabled button; undefined when they can. */
    registerBlockedReason?: string;
    /** Stored custom name when the chain has one. */
    name?: string;
    /** The lobby's late-registration line, including the live cutoff when open. */
    lateRegistrationLabel: string;
    /** A new entrant can register while the running tournament is in its late window. */
    lateEntryOpen: boolean;
    /** This viewer has joined late and is waiting for a table assignment. */
    waitingForSeat: boolean;
    /** "Antes from level N" or "No antes", from the structure (ui#891). */
    anteLabel: string;
    /**
     * When the event ended, for the lobby's 24h hide. Cancelled = the
     * scheduled start (MTTs cancel at that time). Finished = when the winner
     * was declared (state finishedAt/endedAt, else the tournament_finished tx
     * time), falling back to levelStartTime / startedAt / the scheduled start
     * only when no declared-at timestamp is available.
     */
    endedAtMs?: number;
}

/** Entrants that count toward the field: registered, or already playing/busted after the start. */
function countedEntrants(entrants: TournamentEntrantView[]): TournamentEntrantView[] {
    return entrants.filter(e => e.status !== "unregistered");
}

/**
 * The time the lobby uses to age out a finished or cancelled tournament.
 * Undefined while the event is still live.
 *
 * Finished time, in order: a finishedAt/endedAt on the tournament record if
 * the engine wrote one; else `declaredAtMs` from the tournament_finished tx
 * (the same transaction that writes place 1 and settles payouts — the trigger
 * the lobby already uses to show Finished); else a lower bound of
 * levelStartTime, startedAt, or the scheduled start, when no declared-at
 * timestamp is obtainable.
 */
export function tournamentEndedAtMs(state: TournamentStateDTO, phase: TournamentLobbyPhase, declaredAtMs?: number): number | undefined {
    if (phase === "cancelled") return state.options.startTime > 0 ? state.options.startTime : undefined;
    if (phase !== "finished") return undefined;
    if (!isNullish(state.finishedAt) && state.finishedAt > 0) return state.finishedAt;
    if (!isNullish(state.endedAt) && state.endedAt > 0) return state.endedAt;
    if (!isNullish(declaredAtMs) && declaredAtMs > 0) return declaredAtMs;
    if (!isNullish(state.levelStartTime) && state.levelStartTime > 0) return state.levelStartTime;
    if (!isNullish(state.startedAt) && state.startedAt > 0) return state.startedAt;
    return state.options.startTime > 0 ? state.options.startTime : undefined;
}

export function tournamentPhase(state: TournamentStateDTO, nowMs: number): TournamentLobbyPhase {
    // Place 1 is written only when the tournament is over (same rule as sit-and-go
    // hasTournamentFinished). The chain usually flips status to "finished" as well;
    // if results arrive first, the lobby must not keep showing the event as in play.
    if (state.status === "cancelled") return "cancelled";
    if (state.status === "finished" || tournamentWinnerAddress(state)) return "finished";
    if (state.status === "running") return "running";
    if (nowMs >= state.options.startTime) return "starting";
    return countedEntrants(state.entrants).length >= state.options.maxEntrants ? "full" : "open";
}

/** The table an entrant is playing at: its game id and number (the `n` of `<tournamentId>/t<n>`), or undefined when they are not seated. */
function tablePlayedBy(entrant: TournamentEntrantView | undefined): { gameId: string; number: number } | undefined {
    if (isNullish(entrant) || entrant.status !== "playing" || isNullish(entrant.tableId)) return undefined;
    return { gameId: gameIdFromTableId(entrant.tableId), number: Number(entrant.tableId.slice(entrant.tableId.lastIndexOf("/") + 2)) };
}

/**
 * The lobby card for a tournament as seen by `viewer` (undefined = no wallet).
 * Registration closes at the start time, so the buttons follow the clock rather
 * than waiting for the chain to flip the status.
 */
export function buildTournamentCard(record: TournamentRecord, viewer: string | undefined, nowMs: number, declaredAtMs?: number): TournamentLobbyCard {
    const { state, creator } = record;
    const phase = tournamentPhase(state, nowMs);
    const cost = tournamentEntryCost(state.options);
    const registered = countedEntrants(state.entrants).length;
    const mine = isNullish(viewer) ? undefined : state.entrants.find(e => e.address === viewer);
    const isRegistered = !isNullish(mine) && mine.status !== "unregistered";
    const registering = phase === "open" || phase === "full";
    const lateWindow = phase === "running" ? lateRegistrationWindow(state, nowMs) : { open: false };
    const lateEntryOpen = phase === "running" && lateWindow.open;
    const isProjected = state.status === "registering" && phase !== "finished";
    const runnersLeft = state.entrants.filter(e => e.status === "playing").length;
    const winnerAddress = tournamentWinnerAddress(state);

    let registerBlockedReason: string | undefined;
    if (isNullish(viewer)) registerBlockedReason = "Connect a wallet to register";
    else if (isRegistered) registerBlockedReason = "You are registered";
    else if (phase === "full") registerBlockedReason = "The tournament is full";
    else if (!registering && !lateEntryOpen) registerBlockedReason = "Registration is closed";

    // Only a running tournament has a seat to take: the chain leaves the winner's status as "playing"
    // (with their table) after the finish, so the status alone would offer a seat in a finished tournament.
    const myTable = phase === "running" ? tablePlayedBy(mine) : undefined;

    const name = state.name ?? state.options.name;
    const endedAtMs = tournamentEndedAtMs(state, phase, declaredAtMs);

    return {
        tournamentId: state.tournamentId,
        creator,
        phase,
        status: state.status,
        registered,
        minEntrants: state.options.minEntrants,
        maxEntrants: state.options.maxEntrants,
        startsAtMs: state.options.startTime,
        msUntilStart: Math.max(0, state.options.startTime - nowMs),
        cost,
        prizePoolMicro: isProjected ? cost.net * BigInt(registered) : BigInt(state.prizePool),
        prizePoolIsProjected: isProjected,
        startingStack: state.options.startingStack,
        seatsPerTable: state.options.seatsPerTable,
        blindLabel: openingLevelLabel(state.options.blindStructure),
        atRiskOfCancelling: registering && registered < state.options.minEntrants,
        isRegistered,
        runnersLeft: registering ? registered : runnersLeft,
        ...(isNullish(winnerAddress) ? {} : { winnerAddress }),
        ...(isNullish(myTable) ? {} : { myTable }),
        canRegister: isNullish(registerBlockedReason),
        canUnregister: registering && !isNullish(mine) && mine.status === "registered",
        ...(isNullish(registerBlockedReason) ? {} : { registerBlockedReason }),
        ...(isNullish(name) ? {} : { name }),
        // TODO(poker-vm#2800): the engine is the authority on when the window shuts
        // (it also closes at the first paid place and while the final table forms),
        // so `closed` must come from the tournament-level SDK helper once it ships;
        // until then the label shows the configured target level while it exists.
        lateRegistrationLabel:
            phase === "running" || phase === "finished"
                ? formatRunningLateRegistration(state.options.lateRegistrationLevels, lateWindow)
                : formatTournamentLateRegistration(state.options.lateRegistrationLevels, false),
        lateEntryOpen,
        waitingForSeat: phase === "running" && isRegistered && isNullish(myTable),
        anteLabel: describeAnteSchedule(state.options.blindStructure),
        ...(isNullish(endedAtMs) ? {} : { endedAtMs })
    };
}

/** Cards ordered for the lobby: open registration first (soonest start), then running, then finished/cancelled (in the order given, newest first). */
export function sortTournamentCards(cards: TournamentLobbyCard[]): TournamentLobbyCard[] {
    const rank = (c: TournamentLobbyCard): number => {
        // A tournament the viewer is playing in comes first.
        if (!isNullish(c.myTable)) return -1;
        switch (c.phase) {
            case "open":
            case "full":
            case "starting":
                return 0;
            case "running":
                return 1;
            default:
                return 2;
        }
    };
    return cards
        .map((card, index) => ({ card, index }))
        .sort((a, b) => {
            const r = rank(a.card) - rank(b.card);
            if (r !== 0) return r;
            if (rank(a.card) === 0) return a.card.startsAtMs - b.card.startsAtMs;
            return a.index - b.index;
        })
        .map(x => x.card);
}

/** The label on a card's status chip. */
export function phaseLabel(phase: TournamentLobbyPhase): string {
    switch (phase) {
        case "open":
            return "Registering";
        case "full":
            return "Full";
        case "starting":
            return "Starting";
        case "running":
            return "Started";
        case "finished":
            return "Finished";
        case "cancelled":
            return "Cancelled";
    }
}

/** "25/50 blinds, 5 min levels": the structure's opening level, as the engine will play it. Empty when the structure cannot be expanded. */
export function openingLevelLabel(structure: BlindStructureDTO): string {
    try {
        const level = expandBlindLevel(resolveBlindPreset(structure), 0);
        return `${Number(level.smallBlind).toLocaleString("en-US")}/${Number(level.bigBlind).toLocaleString("en-US")} blinds, ${level.durationMinutes} min levels`;
    } catch {
        return "";
    }
}

/** micro-USDC to "$1.25" (digits past cents are kept only when non-zero: $0.333333 stays exact). */
export function formatUsdc(micro: bigint): string {
    const whole = micro / 1_000_000n;
    const frac = (micro % 1_000_000n).toString().padStart(6, "0");
    const cents = frac.slice(0, 2);
    const rest = frac.slice(2).replace(/0+$/, "");
    return `$${whole.toLocaleString("en-US")}.${cents}${rest}`;
}

/**
 * The honest escrow wording for the register and unregister dialogs. Nothing here
 * promises a full refund: block52/pokerchain#470 is an open decision, and today
 * unregistering or a cancelled tournament refunds only the escrowed net buy-in.
 */
export function escrowStatement(cost: TournamentEntryCost): { register: string; unregister: string } {
    const fees = cost.entryFee + cost.protocolCut;
    const feeNote = fees > 0n ? ` The ${formatUsdc(fees)} of fees inside the buy-in (entry fee and protocol fee) is taken at registration and is not refunded.` : "";
    return {
        register: `You pay ${formatUsdc(cost.gross)} now. ${formatUsdc(cost.net)} of it is held in escrow for the prize pool.${feeNote}`,
        unregister: `Unregistering returns the ${formatUsdc(cost.net)} held in escrow, not the full ${formatUsdc(cost.gross)} buy-in.${feeNote} If the tournament is cancelled for too few entrants, the refund is currently the same escrowed amount.`
    };
}

/** Field size while registering ("3/27"); remaining of the field while running; "7 entrants" once finished. */
export function lobbyRunnersLabel(card: Pick<TournamentLobbyCard, "phase" | "registered" | "maxEntrants" | "runnersLeft">): string {
    if (card.phase === "running") return `${card.runnersLeft} left of ${card.registered}`;
    if (card.phase === "finished" || card.phase === "cancelled") {
        return card.registered === 1 ? "1 entrant" : `${card.registered} entrants`;
    }
    return `${card.registered} / ${card.maxEntrants}`;
}
