/**
 * GameMessageBus — serialized ingest queue between the WebSocket and React
 * (WS Action Bus, Phase 1).
 *
 * Plain TypeScript, no React imports, fully unit-testable. Responsibilities in
 * this phase (behaviour-preserving passthrough):
 *
 *   1. classify each raw message (via {@link classifyMessage});
 *   2. assign a strictly-monotonic `seq`;
 *   3. update the LOGICAL track immediately at ingest — `setLatestGameState`
 *      is fed the snapshot the instant it arrives, before any queueing, so
 *      action submission always reads a fresh action index (the plan's
 *      two-track invariant, critical even though Phase 1 adds zero delay);
 *   4. enqueue and drain one item at a time (serialization guarantee) with
 *      zero pacing delay — decorations/pacing arrive in Phase 3;
 *   5. notify subscribers with the committed item (the RENDER track).
 *
 * Errors jump the queue (Commandment 7 — surfaced immediately). `reset()`
 * clears the queue and last snapshot but never rewinds `seq`.
 */
import { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { classifyMessage, ClassifiedMessage, RawWsMessage } from "./ingest";
import { GameStreamItem, BusIntrospection, DEFAULT_DECORATION, GameEvent } from "./types";
import { deriveEvents } from "./deriveEvents";

/** Cap on the retained commit log so the dev handle never grows unbounded. */
const COMMIT_LOG_CAP = 200;

type Listener = (item: GameStreamItem) => void;

export interface GameMessageBusOptions {
    /** Logical-track mirror — fed at INGEST time (setLatestGameState). */
    setLatestGameState: (state: TexasHoldemStateDTO | undefined) => void;
    /** Clock for `receivedAt`; defaults to performance.now(). Injectable for tests. */
    now?: () => number;
}

export class GameMessageBus {
    private readonly setLatestGameState: (state: TexasHoldemStateDTO | undefined) => void;
    private readonly now: () => number;

    private seq = 0;
    private queue: GameStreamItem[] = [];
    private drainScheduled = false;
    private listeners = new Set<Listener>();

    /** Last snapshot seen at ingest — retained for Phase 2 event derivation. */
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
     * track synchronously, then enqueues for serialized commit.
     */
    public ingest(raw: RawWsMessage, tableId: string): void {
        const classified = classifyMessage(raw, tableId);

        // Ignored frames (acks, unknown types, wrong-table) never reach the queue.
        if (classified.kind === "ignore") {
            return;
        }

        this.seq += 1;

        // Derive events against the PREVIOUS ingested snapshot, before the
        // logical-track update below overwrites lastSnapshot with this frame.
        const events = this.deriveEventsForItem(classified);

        const item: GameStreamItem = {
            seq: this.seq,
            receivedAt: this.now(),
            kind: classified.kind,
            classified,
            events,
            decoration: { ...DEFAULT_DECORATION },
            raw
        };

        // Logical track — commit immediately, before any queueing.
        this.updateLogicalTrack(classified);

        this.introspection.ingested += 1;
        this.introspection.lastSeq = this.seq;

        this.enqueue(item);
    }

    /**
     * Clear the queue and last snapshot (on unsubscribe/resubscribe/replay).
     * `seq` continues monotonically — sequence numbers are never reused.
     */
    public reset(): void {
        this.queue = [];
        this.drainScheduled = false;
        this.lastSnapshot = undefined;
        this.introspection.queueDepth = 0;
    }

    /** The most recent snapshot seen at ingest (logical track view). */
    public getLastSnapshot(): TexasHoldemStateDTO | undefined {
        return this.lastSnapshot;
    }

    /**
     * Derive events for a classified item against the last ingested snapshot.
     * Only `state` items carry events. Regressed snapshots
     * ({@link deriveEvents}) are surfaced via console.error and yield no events —
     * the frame itself is still committed (Commandment 7: surface, never drop).
     */
    private deriveEventsForItem(classified: ClassifiedMessage): GameEvent[] {
        if (classified.kind !== "state") {
            return [];
        }
        try {
            return deriveEvents(this.lastSnapshot, classified.snapshot);
        } catch (err) {
            console.error("[GameMessageBus] event derivation failed:", (err as Error).message);
            return [];
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

    private enqueue(item: GameStreamItem): void {
        if (item.kind === "error") {
            // Errors jump the queue — surfaced immediately (Commandment 7).
            this.queue.unshift(item);
        } else {
            this.queue.push(item);
        }
        this.introspection.queueDepth = this.queue.length;
        this.scheduleDrain();
    }

    private scheduleDrain(): void {
        if (this.drainScheduled) {
            return;
        }
        this.drainScheduled = true;
        // Zero-delay, but asynchronous so a synchronous burst enqueues fully
        // before draining — guaranteeing one item in flight at a time.
        setTimeout(() => {
            this.drainScheduled = false;
            this.drainOne();
        }, 0);
    }

    private drainOne(): void {
        const item = this.queue.shift();
        if (!item) {
            return;
        }
        this.introspection.queueDepth = this.queue.length;
        this.commit(item);
        if (this.queue.length > 0) {
            this.scheduleDrain();
        }
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
