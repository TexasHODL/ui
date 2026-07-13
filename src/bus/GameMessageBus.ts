/**
 * GameMessageBus — serialized, decoratable ingest queue between the WebSocket
 * and React (WS Action Bus, Phases 1–3).
 *
 * Plain TypeScript, no React imports, fully unit-testable. Responsibilities:
 *
 *   1. classify each raw message (via {@link classifyMessage});
 *   2. assign a strictly-monotonic `seq`;
 *   3. derive the typed transitions ({@link deriveEvents}) against the last
 *      INGESTED snapshot;
 *   4. run the registered decorators and merge their output into the item's
 *      {@link Decoration} (Phase 3);
 *   5. update the LOGICAL track immediately at ingest — `setLatestGameState`
 *      is fed the snapshot the instant it arrives, before any queueing, so
 *      action submission always reads a fresh action index (the plan's
 *      two-track invariant — pacing must NEVER delay this track);
 *   6. enqueue and drain STATE items one at a time (serialization guarantee),
 *      honoring each item's `holdPreviousMs` (delay before commit) then
 *      `minDisplayMs` (delay after commit, before the next commit) — Phase 3;
 *   7. notify subscribers with the committed item (the RENDER track).
 *
 * Pacing (Phase 3):
 *   - Only `kind === "state"` items are paced and queued. All other kinds
 *     (`pending`, `actionAccepted`, `error`, `validationErrorNoState`) commit
 *     IMMEDIATELY and synchronously — they jump the queue AND any active hold
 *     (Commandment 7: errors surfaced immediately; optimistic pending shown at
 *     once). They carry no snapshot, so committing them out-of-band never
 *     disturbs the serialized STATE ordering.
 *   - The strict one-in-flight invariant holds: at most one drain timer is ever
 *     pending, and each timer commits exactly one state item before scheduling
 *     the next.
 *
 * Backpressure/coalescing (Phase 3, §2.6):
 *   - When the queued STATE depth exceeds {@link DEPTH_CAP} or the accumulated
 *     hold exceeds {@link HOLD_CAP_MS}, `coalescible` items are dropped, always
 *     keeping the NEWEST item and any hand-boundary (handEnded/handStarted)
 *     items — so the final state converges to the newest frame and every
 *     showdown is shown.
 *   - Under pressure, kept holds are shortened to {@link SHORTENED_HOLD_MS} so
 *     the queue can catch up.
 *
 * `reset()` clears the queue, cancels the in-flight hold timer, and clears the
 * last snapshot — but never rewinds `seq` (sequence numbers are never reused).
 */
import { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { classifyMessage, ClassifiedMessage, RawWsMessage } from "./ingest";
import { GameStreamItem, BusIntrospection, DEFAULT_DECORATION, Decoration, GameEvent, Decorator } from "./types";
import { deriveEvents } from "./deriveEvents";
import { buildDefaultDecorators } from "./decorators";
import { getCosmosAddressSync } from "../utils/cosmosAccountUtils";

/** Cap on the retained commit log so the dev handle never grows unbounded. */
const COMMIT_LOG_CAP = 200;

/** Queued STATE items above this trigger coalescing (§2.6). */
export const DEPTH_CAP = 5;

/** Accumulated queued hold (ms) above this triggers coalescing (§2.6). */
export const HOLD_CAP_MS = 4000;

/** Under pressure, an item's post-commit hold is clamped to this (§2.6). */
export const SHORTENED_HOLD_MS = 500;

type Listener = (item: GameStreamItem) => void;

export interface GameMessageBusOptions {
    /** Logical-track mirror — fed at INGEST time (setLatestGameState). */
    setLatestGameState: (state: TexasHoldemStateDTO | undefined) => void;
    /** Clock for `receivedAt` and commit timestamps; defaults to performance.now(). */
    now?: () => number;
    /** Decorators to run at ingest; defaults to {@link buildDefaultDecorators}. */
    decorators?: Decorator[];
    /** Local cosmos address accessor for remoteActionSound; defaults to localStorage. */
    getLocalAddress?: () => string | null;
}

export class GameMessageBus {
    private readonly setLatestGameState: (state: TexasHoldemStateDTO | undefined) => void;
    private readonly now: () => number;
    private readonly decorators: Decorator[];

    private seq = 0;
    private queue: GameStreamItem[] = [];
    private listeners = new Set<Listener>();

    /** True while a drain cycle owns the loop (a hold timer is pending). */
    private draining = false;
    /** The single pending hold/minDisplay timer, or null. */
    private drainTimer: ReturnType<typeof setTimeout> | null = null;
    /** minDisplay owed by the last committed item, applied before the next commit. */
    private carryDelayMs = 0;

    /** Last snapshot seen at ingest — retained for event derivation + decorators. */
    private lastSnapshot: TexasHoldemStateDTO | undefined = undefined;

    /** Live introspection object; the provider aliases window.__B52_BUS__ to it. */
    public readonly introspection: BusIntrospection = {
        lastSeq: 0,
        ingested: 0,
        committed: 0,
        coalesced: 0,
        queueDepth: 0,
        lastEventCount: 0,
        totalEvents: 0,
        commitLog: []
    };

    constructor(options: GameMessageBusOptions) {
        this.setLatestGameState = options.setLatestGameState;
        this.now = options.now ?? (() => performance.now());
        this.decorators = options.decorators ?? buildDefaultDecorators(options.getLocalAddress ?? getCosmosAddressSync);
    }

    /** Subscribe to committed items. Returns an unsubscribe function. */
    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Ingest a single parsed WS message for `tableId`. Updates the logical
     * track synchronously, then enqueues (state) or commits immediately (all
     * other kinds) for serialized commit.
     */
    public ingest(raw: RawWsMessage, tableId: string): void {
        const classified = classifyMessage(raw, tableId);

        // Ignored frames (acks, unknown types, wrong-table) never reach the queue.
        if (classified.kind === "ignore") {
            return;
        }

        this.seq += 1;

        // Snapshot the previous ingested state BEFORE the logical-track update
        // below overwrites it — decorators and derivation both diff against it.
        const prevSnapshot = this.lastSnapshot;
        const events = this.deriveEventsForItem(classified, prevSnapshot);

        const item: GameStreamItem = {
            seq: this.seq,
            receivedAt: this.now(),
            kind: classified.kind,
            classified,
            events,
            decoration: { ...DEFAULT_DECORATION },
            raw
        };

        // Run decorators to accumulate the item's decoration (Phase 3).
        this.applyDecorators(item, prevSnapshot);

        // Logical track — commit immediately, before any queueing/pacing.
        this.updateLogicalTrack(classified);

        this.introspection.ingested += 1;
        this.introspection.lastSeq = this.seq;

        this.enqueue(item);
    }

    /**
     * Clear the queue and last snapshot, and cancel any in-flight hold timer
     * (on unsubscribe/resubscribe/replay). `seq` continues monotonically —
     * sequence numbers are never reused — and the commit log is retained so the
     * dev handle survives a resubscribe (seq continuity is observable there).
     */
    public reset(): void {
        this.queue = [];
        this.draining = false;
        this.carryDelayMs = 0;
        if (this.drainTimer !== null) {
            clearTimeout(this.drainTimer);
            this.drainTimer = null;
        }
        this.lastSnapshot = undefined;
        this.introspection.queueDepth = 0;
    }

    /** The most recent snapshot seen at ingest (logical track view). */
    public getLastSnapshot(): TexasHoldemStateDTO | undefined {
        return this.lastSnapshot;
    }

    // ---- ingest helpers ----------------------------------------------------

    /**
     * Derive events for a classified item against the last ingested snapshot.
     * Only `state` items carry events. Regressed snapshots ({@link deriveEvents})
     * are surfaced via console.error and yield no events — the frame itself is
     * still committed (Commandment 7: surface, never drop).
     */
    private deriveEventsForItem(classified: ClassifiedMessage, prev: TexasHoldemStateDTO | undefined): GameEvent[] {
        if (classified.kind !== "state") {
            return [];
        }
        try {
            return deriveEvents(prev, classified.snapshot);
        } catch (err) {
            console.error("[GameMessageBus] event derivation failed:", (err as Error).message);
            return [];
        }
    }

    private applyDecorators(item: GameStreamItem, prev: TexasHoldemStateDTO | undefined): void {
        for (const decorator of this.decorators) {
            const patch = decorator(item, prev);
            item.decoration = mergeDecoration(item.decoration, patch);
        }
    }

    private updateLogicalTrack(classified: ClassifiedMessage): void {
        if (classified.kind === "state") {
            this.lastSnapshot = classified.snapshot;
            this.setLatestGameState(classified.snapshot);
        } else if (classified.kind === "error" && classified.clearGameState) {
            this.lastSnapshot = undefined;
            this.setLatestGameState(undefined);
        }
    }

    // ---- queue + paced drain ----------------------------------------------

    private enqueue(item: GameStreamItem): void {
        // Non-state kinds are never paced: they carry no snapshot, so they jump
        // the queue AND any active hold, committing immediately (Commandment 7).
        if (item.kind !== "state") {
            this.commit(item);
            return;
        }
        this.queue.push(item);
        this.introspection.queueDepth = this.queue.length;
        this.scheduleDrain();
    }

    private scheduleDrain(): void {
        // A drain cycle already owns the loop; it will pick up newly-queued items.
        if (this.draining || this.queue.length === 0) {
            return;
        }
        this.draining = true;
        this.pump();
    }

    /**
     * Schedule committing the head item after its pre-commit delay, then recurse.
     * One timer pending at a time — the serialization guarantee. A 0ms delay
     * still goes through a timer boundary, so each `runOnlyPendingTimers()`
     * flushes exactly one commit.
     */
    private pump(): void {
        this.coalesce();

        if (this.queue.length === 0) {
            if (this.carryDelayMs > 0) {
                // The queue drained but the last commit still owes a minDisplay
                // hold (e.g. a showdown with nothing yet behind it). Wait it out
                // so a frame arriving during the window still honors the hold,
                // rather than committing early.
                const wait = this.carryDelayMs;
                this.carryDelayMs = 0;
                this.drainTimer = setTimeout(() => {
                    this.drainTimer = null;
                    this.pump();
                }, wait);
                return;
            }
            this.draining = false;
            return;
        }

        const head = this.queue[0];
        const underPressure = this.queue.length > DEPTH_CAP || this.accumulatedHoldMs() > HOLD_CAP_MS;
        const holdPreviousMs = head.decoration.holdPreviousMs ?? 0;
        const preDelay = this.carryDelayMs + holdPreviousMs;
        this.carryDelayMs = 0;

        this.drainTimer = setTimeout(() => {
            this.drainTimer = null;
            const item = this.queue.shift();
            if (!item) {
                this.draining = false;
                return;
            }
            this.introspection.queueDepth = this.queue.length;
            this.commit(item);

            let minDisplayMs = item.decoration.minDisplayMs ?? 0;
            if (underPressure && minDisplayMs > SHORTENED_HOLD_MS) {
                // Shorten holds (incl. handEnded) so the queue can catch up (§2.6).
                minDisplayMs = SHORTENED_HOLD_MS;
            }
            this.carryDelayMs = minDisplayMs;
            this.pump();
        }, preDelay);
    }

    /**
     * Drop coalescible items when over the depth/hold cap, always keeping the
     * newest item and any hand-boundary item so the final state converges and no
     * showdown is missed (§2.6). Increments the `coalesced` introspection counter.
     */
    private coalesce(): void {
        const overDepth = this.queue.length > DEPTH_CAP;
        const overHold = this.accumulatedHoldMs() > HOLD_CAP_MS;
        if (!overDepth && !overHold) {
            return;
        }
        const lastIndex = this.queue.length - 1;
        const kept: GameStreamItem[] = [];
        for (let i = 0; i < this.queue.length; i++) {
            const it = this.queue[i];
            const isNewest = i === lastIndex;
            const isHandBoundary = it.events.some(e => e.type === "handEnded" || e.type === "handStarted");
            if (it.decoration.coalescible && !isNewest && !isHandBoundary) {
                this.introspection.coalesced += 1;
            } else {
                kept.push(it);
            }
        }
        this.queue = kept;
        this.introspection.queueDepth = this.queue.length;
    }

    private accumulatedHoldMs(): number {
        let sum = 0;
        for (const it of this.queue) {
            sum += (it.decoration.holdPreviousMs ?? 0) + (it.decoration.minDisplayMs ?? 0);
        }
        return sum;
    }

    private commit(item: GameStreamItem): void {
        this.introspection.committed += 1;
        this.introspection.lastEventCount = item.events.length;
        this.introspection.totalEvents += item.events.length;
        this.introspection.commitLog.push({ seq: item.seq, committedAt: this.now(), eventCount: item.events.length });
        if (this.introspection.commitLog.length > COMMIT_LOG_CAP) {
            this.introspection.commitLog.splice(0, this.introspection.commitLog.length - COMMIT_LOG_CAP);
        }
        this.listeners.forEach(listener => listener(item));
    }
}

/**
 * Fold a decorator's partial output into an accumulating decoration per the
 * DECORATION-MERGE RULE (see {@link Decorator}): max holds, concat hints, OR
 * coalescible. Pure — returns a new object, mutates neither argument.
 */
export function mergeDecoration(base: Decoration, patch: Partial<Decoration>): Decoration {
    const merged: Decoration = {
        minDisplayMs: maxHold(base.minDisplayMs, patch.minDisplayMs),
        holdPreviousMs: maxHold(base.holdPreviousMs, patch.holdPreviousMs),
        animations: patch.animations ? [...base.animations, ...patch.animations] : base.animations,
        sounds: patch.sounds ? [...base.sounds, ...patch.sounds] : base.sounds,
        coalescible: base.coalescible || (patch.coalescible ?? false)
    };
    // Keep the field absent (not 0) when neither side set it, so "no hold" reads
    // cleanly in introspection and the drain's `?? 0` still applies.
    if (merged.minDisplayMs === undefined) delete merged.minDisplayMs;
    if (merged.holdPreviousMs === undefined) delete merged.holdPreviousMs;
    return merged;
}

function maxHold(a: number | undefined, b: number | undefined): number | undefined {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return Math.max(a, b);
}
