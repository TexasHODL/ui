/**
 * Completed-hand celebration (TexasHODL/ui#195).
 *
 * After a hand ends the chain keeps `round=end`, the awarded pot, `winners`,
 * `nextToAct`, the dealer and the hole cards until another hand starts. The
 * table was painting that snapshot for as long as it lasted, and the win
 * glow / WINS badge followed the seat number, so a player who sat back down
 * inherited the previous occupant's award.
 *
 * This decides what to paint. It does not touch stacks, pots or settlement.
 * The clock starts once, when the win animation actually starts, and identical
 * snapshots cannot move it. A hard cap of {@link WIN_CELEBRATION_MAX_MS} clears
 * the award even if no next hand arrives. A winner who leaves, or whose seat
 * is taken by someone else, drops out immediately and cannot pick the award
 * back up by sitting down again.
 */
import { TexasHoldemRound, type ActionDTO } from "@block52/poker-vm-sdk";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { hasContent, hasElements, hasValue, isEmpty, isNullish, isNumber, isRecord, isString } from "./guards";
import { normalizeTimestamp } from "./timerUtils";

/** Hard maximum a win celebration stays up, measured from when it actually started. */
export const WIN_CELEBRATION_MAX_MS = 5000;

export type CelebrationOccupant = {
    address?: string;
    seat: number;
};

/** Remembered across snapshots and, when a table id exists, across refresh. */
export type CelebrationClock = {
    /** hand number + the winning addresses. Never the seat. */
    key: string;
    /** Epoch ms when this client started the win animation for `key`. */
    startedAt: number;
    /** Winning addresses whose occupancy already broke. Sticky. */
    retired: string[];
};

export type CompletedHandView = {
    /**
     * `null` means "do not filter" (a live hand, a replay, or no layer).
     * An empty set means the award is over: show no winner visuals.
     */
    activeWinnerAddresses: ReadonlySet<string> | null;
    /** Lingering end-of-hand: hide the completed pot, old cards, dealer and the end-state Next label. */
    hideCompletedHand: boolean;
    /** Epoch ms when the award must end. `null` when nothing is counting. */
    celebrateUntil: number | null;
    /** Stable id of the remembered clock, for persistence. `null` when there is nothing to remember. */
    clockSerial: string | null;
};

export const SHOW_LIVE_HAND: CompletedHandView = {
    activeWinnerAddresses: null,
    hideCompletedHand: false,
    celebrateUntil: null,
    clockSerial: null
};

const NO_WINNERS: ReadonlySet<string> = new Set();
const NO_SEATS: CelebrationOccupant[] = [];

type WinnerIdentity = {
    address: string;
    seat: number;
};

export function winCelebrationStorageKey(tableId: string): string {
    return `${STORAGE_KEYS.winCelebration}:${tableId}`;
}

export function celebrationKey(handNumber: number, addresses: readonly string[]): string {
    return `${handNumber}|${[...new Set(addresses)].sort().join(",")}`;
}

/** Latest action time on the snapshot, or null when the hand carries no timestamp. */
export function handEndedAtMs(actions: Array<Pick<ActionDTO, "timestamp">> | null | undefined): number | null {
    if (!hasElements(actions)) return null;
    let latest: number | null = null;
    for (const action of actions) {
        if (!isNumber(action.timestamp)) continue;
        if (isNullish(latest) || action.timestamp > latest) latest = action.timestamp;
    }
    if (isNullish(latest)) return null;
    return normalizeTimestamp(latest);
}

export function parseCelebrationClock(value: unknown): CelebrationClock | null {
    if (!isRecord(value)) return null;
    if (!isString(value.key) || !hasContent(value.key)) return null;
    if (!isNumber(value.startedAt) || !Number.isFinite(value.startedAt)) return null;
    if (!Array.isArray(value.retired)) return null;
    const retired: string[] = [];
    for (const entry of value.retired) {
        if (!isString(entry)) return null;
        retired.push(entry.toLowerCase());
    }
    return { key: value.key, startedAt: value.startedAt, retired };
}

export function readCelebrationClock(storage: Pick<Storage, "getItem">, tableId: string): CelebrationClock | null {
    if (!hasContent(tableId)) return null;
    try {
        const raw = storage.getItem(winCelebrationStorageKey(tableId));
        if (isNullish(raw) || !hasContent(raw)) return null;
        return parseCelebrationClock(JSON.parse(raw));
    } catch (err) {
        console.error("Failed to read win celebration clock:", err);
        return null;
    }
}

export function writeCelebrationClock(storage: Pick<Storage, "setItem">, tableId: string, clock: CelebrationClock): void {
    if (!hasContent(tableId)) return;
    try {
        storage.setItem(winCelebrationStorageKey(tableId), JSON.stringify(clock));
    } catch (err) {
        console.error("Failed to store win celebration clock:", err);
    }
}

function winnerIdentities(winners: CelebrationOccupant[] | null | undefined): WinnerIdentity[] {
    if (!hasElements(winners)) return [];
    const identities: WinnerIdentity[] = [];
    for (const winner of winners) {
        if (!hasContent(winner.address)) continue;
        identities.push({ address: winner.address.toLowerCase(), seat: winner.seat });
    }
    return identities;
}

function occupantMatches(winner: WinnerIdentity, seated: CelebrationOccupant[]): boolean {
    for (const player of seated) {
        if (player.seat !== winner.seat) continue;
        return hasContent(player.address) && player.address.toLowerCase() === winner.address;
    }
    return false;
}

function clockSerial(clock: CelebrationClock): string {
    return `${clock.key}@${clock.startedAt}@${clock.retired.join("&")}`;
}

/**
 * Where a cold load (refresh, or opening a table already on the end snapshot)
 * should anchor the clock. A client that has been watching starts at `now`:
 * the run-out can land the winner frame long after the chain timestamp, and
 * the five seconds are measured from the animation, not from the chain.
 */
function initialStartedAt(watched: boolean, handEndedAt: number | null, now: number): number {
    if (watched || isNullish(handEndedAt)) return now;
    return handEndedAt > now ? now : handEndedAt;
}

export type DecideCelebrationInput = {
    now: number;
    handNumber: number;
    round: string | null | undefined;
    winners: CelebrationOccupant[] | null | undefined;
    seated: CelebrationOccupant[] | null | undefined;
    handEndedAt: number | null;
    previous: CelebrationClock | null;
    /** This client has already rendered an earlier snapshot at this table. */
    watched: boolean;
};

export function decideCompletedHand(input: DecideCelebrationInput): { view: CompletedHandView; clock: CelebrationClock | null } {
    const ended = input.round === TexasHoldemRound.END;
    const identities = winnerIdentities(input.winners);
    const seated = hasElements(input.seated) ? input.seated : NO_SEATS;

    if (isEmpty(identities)) {
        return {
            view: ended
                ? { activeWinnerAddresses: NO_WINNERS, hideCompletedHand: true, celebrateUntil: null, clockSerial: null }
                : SHOW_LIVE_HAND,
            clock: null
        };
    }

    const key = celebrationKey(input.handNumber, identities.map(winner => winner.address));
    const previous = hasValue(input.previous) && input.previous.key === key ? input.previous : null;
    const startedAt = previous ? previous.startedAt : initialStartedAt(input.watched, input.handEndedAt, input.now);

    const retired = new Set<string>();
    if (hasValue(previous)) {
        for (const address of previous.retired) retired.add(address.toLowerCase());
    }
    for (const winner of identities) {
        if (retired.has(winner.address)) continue;
        if (!occupantMatches(winner, seated)) retired.add(winner.address);
    }
    const retiredList = [...retired].sort();
    const clock: CelebrationClock = { key, startedAt, retired: retiredList };

    const elapsed = input.now - startedAt;
    const alive = elapsed >= 0 && elapsed < WIN_CELEBRATION_MAX_MS;
    const active = new Set<string>();
    if (alive) {
        for (const winner of identities) {
            if (retired.has(winner.address)) continue;
            if (!occupantMatches(winner, seated)) continue;
            active.add(winner.address);
        }
    }

    const celebrating = active.size > 0;
    return {
        view: {
            activeWinnerAddresses: active,
            hideCompletedHand: ended && !celebrating,
            celebrateUntil: celebrating ? startedAt + WIN_CELEBRATION_MAX_MS : null,
            clockSerial: clockSerial(clock)
        },
        clock
    };
}

/**
 * Winners the table should still paint. `active === null` leaves the snapshot
 * alone (live hand, replay). An empty set clears every winner visual.
 */
export function filterCelebratingWinners<T extends { address?: string }>(
    winners: T[] | null | undefined,
    active: ReadonlySet<string> | null
): T[] | null {
    if (!hasElements(winners)) return null;
    if (isNullish(active)) return winners;
    const visible = winners.filter(winner => hasContent(winner.address) && active.has(winner.address.toLowerCase()));
    return hasElements(visible) ? visible : null;
}
