/**
 * Prize-pool labels for the payout box.
 *
 * A sit-and-go reads amounts off the table (`useSitAndGoPayouts`) and turns each
 * one into a share of their sum. A multi-table tournament keeps the schedule on
 * the tournament record instead: the whole-tournament prize pool, and one entry
 * per paid place. Entries carry a micro-USDC amount. When a place has only a
 * percentage, the amount is the same integer share the box uses to label an
 * amount (`floor(pool * bps / 10000)`), so the label round-trips.
 */
import type { TournamentStateDTO } from "../types/tournament";
import { hasElements, hasValue, isNullish, isNumber, isRecord, isString } from "./guards";
import { parsePrizeMicro } from "./prizeDisplay";

export interface PayoutPlaceView {
    place: number;
    /** Micro-USDC string, the chain amount or the amount computed from a percentage. */
    payout: string;
}

export interface PayoutStructureView {
    /** Whole prize pool, micro-USDC string. */
    prizePool: string;
    places: PayoutPlaceView[];
}

/** Share of the pool, truncated to 2 decimals. 5600000 of 11200000 → 50. */
export function payoutSharePercent(payoutMicro: string, prizePoolMicro: string): number {
    const pool = parsePrizeMicro(prizePoolMicro);
    const payout = parsePrizeMicro(payoutMicro);
    if (isNullish(pool) || isNullish(payout) || pool <= 0n) return 0;
    return Number((payout * 10000n) / pool) / 100;
}

const PERCENT_TEXT = /^(\d+)(?:\.(\d+))?%?$/;

/** A positive percentage from a schedule entry, still in the units the chain sent. */
function readPercent(value: unknown): number | null {
    if (isNumber(value) && Number.isFinite(value) && value > 0) return value;
    if (!isString(value)) return null;
    const match = PERCENT_TEXT.exec(value.trim());
    if (isNullish(match)) return null;
    const points = Number(`${match[1]}.${match[2] ?? ""}`);
    if (!Number.isFinite(points) || points <= 0) return null;
    return points;
}

/**
 * Basis points for one percentage. A schedule that adds up to more than 100 is
 * already in basis points (5000 = 50%, and a 100 beside it is 1%, not 100%).
 * Otherwise the numbers are percent points (50 = 50%), which the box labels.
 */
function percentToBps(points: number, scheduleIsBasisPoints: boolean): bigint {
    if (scheduleIsBasisPoints) return BigInt(Math.round(points));
    return BigInt(Math.round(points * 100));
}

function positiveMicro(value: unknown): string | null {
    if (!isString(value)) return null;
    const micro = parsePrizeMicro(value);
    if (isNullish(micro) || micro <= 0n) return null;
    return micro.toString();
}

function placeOf(raw: Record<string, unknown>): number | null {
    const place = raw.place;
    if (!isNumber(place) || !Number.isInteger(place) || place < 1) return null;
    return place;
}

/**
 * Paid places for a tournament record. Amounts on the schedule win. A place
 * with no positive amount is priced from its percentage of `prizePool`.
 * Returns null when there is no positive pool or no paid place.
 */
export function tournamentPayoutStructure(tournament: Pick<TournamentStateDTO, "prizePool" | "payouts"> | undefined): PayoutStructureView | null {
    if (isNullish(tournament)) return null;
    const pool = parsePrizeMicro(tournament.prizePool);
    if (isNullish(pool) || pool <= 0n || !hasElements(tournament.payouts)) return null;

    const pending = tournament.payouts.map(entry => readScheduleEntry(entry));
    const percentages = pending.flatMap(entry => (hasValue(entry) && isNullish(entry.amount) && hasValue(entry.percent) ? [entry.percent] : []));
    const scheduleIsBasisPoints = percentages.reduce((sum, points) => sum + points, 0) > 100;

    const places: PayoutPlaceView[] = [];
    for (const entry of pending) {
        if (isNullish(entry)) continue;
        const payout = resolvePayout(entry, pool, scheduleIsBasisPoints);
        if (hasValue(payout)) places.push({ place: entry.place, payout });
    }
    if (!hasElements(places)) return null;
    places.sort((a, b) => a.place - b.place);
    return { prizePool: pool.toString(), places };
}

interface ScheduleEntry {
    place: number;
    amount: string | null;
    percent: number | null;
}

function readScheduleEntry(entry: unknown): ScheduleEntry | null {
    if (!isRecord(entry)) return null;
    const place = placeOf(entry);
    if (isNullish(place)) return null;
    return {
        place,
        amount: positiveMicro(entry.amount),
        percent: readPercent(entry.percent) ?? readPercent(entry.percentage)
    };
}

function resolvePayout(entry: ScheduleEntry, pool: bigint, scheduleIsBasisPoints: boolean): string | null {
    if (hasValue(entry.amount)) return entry.amount;
    if (isNullish(entry.percent)) return null;
    const bps = percentToBps(entry.percent, scheduleIsBasisPoints);
    if (bps <= 0n) return null;
    const payout = (pool * bps) / 10000n;
    if (payout <= 0n) return null;
    return payout.toString();
}
