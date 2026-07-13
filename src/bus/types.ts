/**
 * WS Action Bus — envelope and decoration types (Phase 1).
 *
 * Snapshot/action/format/variant types come from the SDK (Commandment 1). The
 * types declared here describe only the bus envelope and the decoration
 * pipeline. As of Phase 2 `events` carries the real transitions derived by
 * {@link deriveEvents}; `Decoration`/decorators/pacing remain declared-only
 * (`decoration` is still the inert default) until Phase 3.
 */
import type { TexasHoldemStateDTO, ActionDTO, WinnerDTO, TexasHoldemRound } from "@block52/poker-vm-sdk";
import type { ClassifiedMessage } from "./ingest";

/**
 * Typed transitions derived by diffing prev/next snapshot at ingest
 * ({@link deriveEvents}, Phase 2). One frame can carry several events.
 */
export type GameEvent =
    | { type: "handStarted"; handNumber: number }
    | { type: "playerActed"; action: ActionDTO }
    | { type: "roundAdvanced"; from: TexasHoldemRound; to: TexasHoldemRound; newCommunityCards: string[] }
    | { type: "handEnded"; winners: WinnerDTO[] }
    | { type: "playerJoined"; seat: number; address: string }
    | { type: "playerLeft"; seat: number; address: string }
    | { type: "stackChanged"; seat: number; from: string; to: string }
    | { type: "cardsRevealed"; seat: number; cards: string[] };

/** Every discriminant of {@link GameEvent}, for the typed `useGameEvents` filter. */
export type GameEventType = GameEvent["type"];

/** Animation annotation a decorator may attach. DECLARED for Phase 3. */
export interface AnimationHint {
    kind: string;
    staggerMs?: number;
}

/** Sound annotation a decorator may attach. DECLARED for Phase 3. */
export interface SoundHint {
    kind: string;
    seat?: number;
}

/**
 * What decorators may attach to an item. All optional; the inert default
 * ({@link DEFAULT_DECORATION}) commits immediately with no pacing.
 * DECLARED for Phase 3 — decorators are not run in Phase 1.
 */
export interface Decoration {
    minDisplayMs?: number;
    holdPreviousMs?: number;
    animations: AnimationHint[];
    sounds: SoundHint[];
    coalescible: boolean;
}

/** Inert decoration — commit immediately, no animations/sounds, not coalescible. */
export const DEFAULT_DECORATION: Decoration = {
    animations: [],
    sounds: [],
    coalescible: false
};

/** Pure decorator function. DECLARED for Phase 3. */
export type Decorator = (item: GameStreamItem, prev: TexasHoldemStateDTO | undefined) => Partial<Decoration>;

/**
 * Monotonic envelope around every inbound WS message that the bus commits.
 * `classified` is the discriminated ingest result the provider maps onto React
 * state; `kind` mirrors it for cheap introspection.
 */
export interface GameStreamItem {
    /** Assigned at ingest, strictly monotonic, never reused across resets. */
    seq: number;
    /** performance.now() (or injected clock) at ingest. */
    receivedAt: number;
    kind: ClassifiedMessage["kind"];
    classified: ClassifiedMessage;
    /** Derived transitions for this commit (empty for non-state items). */
    events: GameEvent[];
    /** Accumulated decorations — always the inert default in Phase 1. */
    decoration: Decoration;
    /** Original parsed message, for error surfaces / debugging. */
    raw: unknown;
}

/** Dev-only introspection snapshot exposed on window.__B52_BUS__ (§5.4). */
export interface BusIntrospection {
    lastSeq: number;
    ingested: number;
    committed: number;
    coalesced: number;
    queueDepth: number;
    /** Number of derived events on the most recently committed item. */
    lastEventCount: number;
    /** Running total of derived events across all commits. */
    totalEvents: number;
    commitLog: Array<{ seq: number; committedAt: number; eventCount: number }>;
}

declare global {
    interface Window {
        __B52_BUS__?: BusIntrospection;
    }
}
