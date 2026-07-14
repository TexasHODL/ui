# WS Action Bus — Serialized, Decoratable Game-State Ingest

**Date:** 2026-07-13
**Status:** Phases 0–4 implemented on stacked branches `feat/ws-action-bus-phase-0-1` → `-phase-2` → `-phase-3` → `-phase-4` (local, unpushed). Phase 4 removed the `VITE_GAME_BUS` flag/direct path, deleted `useAutoNewHand`'s timer (triggers rewired to the logical track — a new-hand deal is a submission), replaced `window.seatJoinNotifications` with `playerJoined` events, and updated CLAUDE.md/hooks README. Phase 5 (animation acks, §2.7) implemented on `feat/ws-action-bus-phase-5`. **All phases complete.** Remaining follow-up candidates: WS auto-reconnect (the UI has none; `reconnect.spec.ts` recovers via user-driven re-open); full visual consumption of the card-flip flags in `TableBoard` (Phase 5 mounted `useCardAnimations` as an additive flop-only reveal — per-street turn/river slot mapping is open).
**Owner:** Sam

## Goal

Introduce a bus/queue between the WebSocket and React so that inbound game
messages are **serialized** (processed strictly one at a time, in arrival
order) and can be **decorated** as they arrive — annotations the UI can later
use to delay rendering, trigger animations, play sounds, and pace hand flow —
instead of every consumer reverse-engineering "what happened" by diffing
consecutive snapshots.

---

## 1. Review of the current ingest pipeline

### 1.1 How state arrives today

There is exactly one funnel: `ws.onmessage` in
`src/context/GameStateContext.tsx:174-298`. Every message is parsed,
normalized (`normalizeGatewayMessage`, `src/utils/gameTransport.ts:77-90`),
and — if it's a state update — **fully replaces** the snapshot via
`setGameState(...)` plus an imperative mirror `setLatestGameState(...)`
(`src/hooks/playerActions/transportAction.ts:29-31`, a module-level variable
the non-React action helpers read for action indices).

State fans out through five slice contexts (`GameDataContext`,
`GameMetaContext`, `GameUIContext`, `ReplayContext`, `GameActionsContext`);
`GameDataContext` is the hot one, replaced on every message.

Properties of this pipeline:

- **Snapshot-replace, no events.** No sequence numbers, no retained previous
  snapshot, no derived "what changed" at the source.
- **No pacing.** The gateway transport can deliver the next hand ~150ms after
  a showdown, so consecutive snapshots visually collapse.
- **No bus/queue/emitter anywhere.** No mitt/EventEmitter/rxjs/store in deps
  or src. The closest things are two informal escape hatches:
  `window.seatJoinNotifications` (a global callback registry,
  `useSeatJoinNotification.ts:81-92`) and the `latestGameState` module
  singleton.

### 1.2 How consumers infer transitions (the diff-by-ref pattern)

Because the source emits only snapshots, every "something happened" signal is
hand-rolled downstream with `useRef` diffing:

| Consumer | Detection mechanism |
|---|---|
| `usePlayerActionDropBox.ts:79-144` | max `previousActions[].index` + composed `actionKey` string vs `lastProcessedActionRef` → 2s action badge |
| `useGameStateSounds.ts:31-59` | `lastPlayedIndexRef` + `lastHandNumberRef`, resets on hand change, plays sound for remote players' newest action |
| `useCardAnimations.ts:19-40` | boolean `communityCards.length >= 3` → staggered 1000/1100/1200ms flop flips (doesn't re-fire for turn/river, never resets per hand) |
| `Badge.tsx:43-78` | `prevBannerModeRef` to detect timer→action transitions; priority resolution winner > action > join > timer |
| `useHoleCardWatchdog.ts:40-88` | `handNumber` ref + 1.5s grace to detect missing hole cards |
| `PokerActionPanel.tsx:411` / `PlayerActionButtons.tsx:202` | optimistic dirty-state cleared when `actionCount`/`handNumber` advances, with timeout escape hatch |

### 1.3 Timing hacks that are really "pacing" in disguise

- `useAutoNewHand.ts:10,101` — holds the showdown 2000ms before auto-dealing
  (ui#443). **This is the clearest existing "delay the next state so the user
  can see this one" hack** — exactly what a decorated queue generalizes.
- `useCardAnimations.ts:24-30` — staggered flop flips.
- `usePlayerActionDropBox` / `useSeatJoinNotification` — 2000/150/500ms
  show/hide/exit choreography.
- `VacantPlayer.tsx:196` — 100ms delay before firing the global seat-join
  callback (waiting for a component to mount).

### 1.4 Problems this creates

1. **Duplicated, divergent diffing.** At least four independent
   implementations of "detect the newest action," each with its own reset
   rules and edge cases (hand rollover, reconnect, replay).
2. **No serialization guarantee beyond WS ordering.** If a burst arrives
   (reconnect, catch-up), React batches the `setGameState` calls and
   intermediate snapshots are silently dropped — animations and sounds for
   those transitions never fire, or fire against the wrong snapshot.
3. **No way to pace rendering.** Showdown → next hand is a race; ui#443 was
   patched point-wise in `useAutoNewHand`, but any future "let the pot slide
   to the winner before dealing" needs the same hack again elsewhere.
4. **Untested ingest.** No tests cover the `onmessage` handler or
   `GameDataContext` propagation (only `gameTransport.test.ts` at unit level).

---

## 2. Proposed architecture

### 2.1 Overview

Insert a small, framework-free pipeline between "message parsed" and "React
state committed":

```
ws.onmessage
   │  parse + normalize (existing, extracted to pure module)
   ▼
┌─────────────────────────────────────────────────────────┐
│ GameMessageBus (plain TS class, no React)               │
│                                                         │
│  ingest(msg) ──► envelope {seq, receivedAt, msg}        │
│      │                                                  │
│      ▼                                                  │
│  derive(prevSnapshot, nextSnapshot) ──► GameEvent[]     │
│      │                                                  │
│      ▼                                                  │
│  decorate(item) — registered decorators annotate:       │
│      {minDisplayMs, animations[], sounds[], coalesce}   │
│      │                                                  │
│      ▼                                                  │
│  FIFO queue ──► serialized drain (one item at a time,   │
│                 honoring decorations before advancing)  │
└─────────────────────────────────────────────────────────┘
   │                                    │
   │ (immediate, every item)            │ (paced)
   ▼                                    ▼
logical track:                     rendered track:
setLatestGameState(...)            setGameState(...) → GameDataContext
legalActions / action submission   components, animations, sounds
```

### 2.2 The critical design decision: two tracks

**Logical state is committed immediately; only rendered state is paced.**

The action helpers (`transportAction.ts`) read `latestGameState` for
`nextActionIndex` and legal-action signatures. If the queue delayed that,
a paced UI would submit actions against stale indices and the chain would
reject them. So:

- **Logical track** — on ingest, before queueing, every state snapshot
  immediately updates `setLatestGameState(...)`. Action submission, turn
  detection for auto-actions (`useAutoFold`, `useAutoMuck`), and the
  hole-card watchdog stay on this track. Zero added latency.
- **Rendered track** — the queue drains into `setGameState(...)` at the pace
  the decorations dictate. Everything visual reads this track, as it already
  does via `GameDataContext`.

Divergence between the tracks is bounded (see §2.6 backpressure) and always
converges to the same final snapshot.

### 2.3 Types (new file `src/bus/types.ts`)

All snapshot types come from the SDK (`TexasHoldemStateDTO`, `ActionDTO`,
`GameFormat`, `GameVariant`) per Commandment 1. New types describe only the
envelope and decorations:

```typescript
/** Monotonic envelope around every inbound WS message. */
export interface GameStreamItem {
    seq: number;                       // assigned at ingest, monotonic per subscription
    receivedAt: number;                // performance.now() at ingest
    kind: "state" | "pending" | "actionAccepted" | "error";
    // kind === "state":
    snapshot?: TexasHoldemStateDTO;
    format?: GameFormat;
    variant?: GameVariant;
    events: GameEvent[];               // derived transitions (empty for non-state)
    decoration: Decoration;            // accumulated by decorators
    raw: unknown;                      // original message, for error surfaces
}

/** Typed transitions derived by diffing prev/next snapshot at ingest. */
export type GameEvent =
    | { type: "handStarted"; handNumber: number }
    | { type: "playerActed"; action: ActionDTO }          // one per new previousActions entry
    | { type: "roundAdvanced"; from: TexasHoldemRound; to: TexasHoldemRound; newCommunityCards: string[] }
    | { type: "handEnded"; winners: WinnerDTO[] }
    | { type: "playerJoined"; seat: number; address: string }
    | { type: "playerLeft"; seat: number; address: string }
    | { type: "stackChanged"; seat: number; from: string; to: string }
    | { type: "cardsRevealed"; seat: number; cards: string[] };  // per-viewer masked "X" → real at showdown

/** What decorators may attach. All optional; empty = commit immediately. */
export interface Decoration {
    minDisplayMs?: number;             // hold THIS snapshot on screen at least this long
    holdPreviousMs?: number;           // delay committing this snapshot (previous stays visible)
    animations: AnimationHint[];       // e.g. {kind: "dealFlop", staggerMs: 100}
    sounds: SoundHint[];               // e.g. {kind: "check", seat: 3}
    coalescible: boolean;              // true = may be skipped if a newer state item is queued
}

export type Decorator = (item: GameStreamItem, prev: TexasHoldemStateDTO | undefined) => Partial<Decoration>;
```

Per Commandment 7, derivation throws/flags on malformed input rather than
defaulting — a snapshot whose `previousActions` regresses without a
`handNumber` change is surfaced as a `validationError`, not silently accepted.

### 2.4 The bus (new file `src/bus/GameMessageBus.ts`)

Plain TypeScript class, no React imports, fully unit-testable:

- `ingest(rawMessage)` — normalize (reusing `normalizeGatewayMessage` /
  `extractGameDataFromMessage` / `validateGameState`), assign `seq`, update
  the logical track, derive events against the last *ingested* snapshot,
  run decorators, enqueue.
- `subscribe(listener)` / typed helpers — consumers receive committed items;
  used by the React provider and by non-React consumers (sounds).
- Drain loop — `async`: take head item, wait `holdPreviousMs`, commit
  (notify listeners → provider calls `setGameState`), wait
  `max(minDisplayMs, animation acks)`, advance. One item in flight, ever —
  this is the serialization guarantee.
- `reset()` — on unsubscribe/resubscribe/replay-mode entry: clear queue,
  clear last snapshot, seq continues (never reused).

Decorators are registered at construction (`src/bus/decorators/*.ts`), each a
pure function, individually unit-tested per Commandment 12's centralize-and-
test spirit. Initial set:

| Decorator | Behavior |
|---|---|
| `showdownHold` | `handEnded` event → `minDisplayMs: 2000` (absorbs the ui#443 hold; `useAutoNewHand` keys off rendered state so no code change needed there beyond removing its own timer — see Phase 4) |
| `communityCardStagger` | `roundAdvanced` with new cards → `animations: [{kind: "dealCards", staggerMs: 100}]` (replaces `useCardAnimations` timers) |
| `actionBadge` | `playerActed` → animation hint consumed by drop-box/badge |
| `remoteActionSound` | `playerActed` by non-local player → sound hint (replaces `useGameStateSounds` ref-diffing) |
| `coalesceCatchUp` | marks items `coalescible` when queue depth > N (see §2.6) |

### 2.5 React integration (Commandment "Context → Provider → Hook")

- `GameStateProvider` keeps owning the WebSocket. Its `onmessage` shrinks to
  `parse → bus.ingest(msg)`. Error/pending/loading handling moves into bus
  item kinds consumed by the provider.
- The provider subscribes to committed items and calls the existing
  `setGameState`/`setGameFormat`/... — **`GameDataContext` and every existing
  hook keep working unchanged.**
- New hook `useGameEvents(filter?)` (`src/hooks/game/useGameEvents.ts`)
  exposes the committed item's `events` + `decoration` so animation/sound
  hooks stop diffing refs. Follows naming (`use[Domain][Feature]`).
- Bus instance lives in a `useMemo`/ref inside the provider (recreated per
  network change, like the WS).

### 2.6 Backpressure and coalescing (the failure mode to design for)

Pacing means the queue can grow: reconnect catch-up bursts, or a fast heads-up
game outrunning a 2s showdown hold. Policy:

- **Queue depth cap (e.g. 5 state items or >4s of accumulated hold).** Beyond
  it, drop items marked `coalescible` (intermediate states within the same
  round), keeping the newest — animations for dropped items are skipped,
  their sounds optionally still fire compressed.
- **`handEnded` items are never coalesced away** — the player must see every
  showdown, but their hold may be shortened under pressure.
- **Replay mode and `loadHistoricalState` bypass the queue entirely**
  (one-shot fetch, no pacing semantics).
- **Errors (`kind: "error"`) jump the queue** — surfaced immediately per
  Commandment 7.

### 2.7 Animation acks (Phase 5)

Fixed `minDisplayMs` values are guesses about how long the UI's choreography
takes; acks make the contract explicit — the drain holds the next commit
until the components animating the current one say they're done, bounded by
a timeout so a missing ack can never stall the stream.

- **Hint contract:** each `AnimationHint` that wants to gate the drain
  carries `ackId: string` (derived `${seq}:${hintIndex}`, assigned by the
  bus, never by decorators) and `ackTimeoutMs: number` (required — no
  default per Commandment 7; the decorator that requests an ack must say
  how long it's allowed to take).
- **Bus API:** `bus.ackAnimation(ackId)`. The drain's post-commit wait
  becomes `max(minDisplayMs, all ack-bearing hints resolved)`, where each
  pending ack resolves on `ackAnimation(ackId)` or its `ackTimeoutMs`,
  whichever comes first.
- **Deadlock safety (the invariants):** every pending ack has a live
  timeout; `reset()` abandons all pending acks; coalescing pressure (§2.6)
  abandons pending acks the same way it compresses holds; non-state kinds
  still bypass everything. A component that unmounts mid-animation simply
  lets the timeout fire — worst case is the old fixed-timer behavior.
- **React side:** the events context exposes `ackAnimation`; a small
  `useAnimationAck(hints)` helper hook returns per-hint `done()` callbacks.
  `useCardAnimations` is the pilot consumer — it acks when the last
  staggered flip completes instead of the bus guessing
  `staggerMs × cards + flip duration`.
- **Introspection:** `__B52_BUS__` gains `pendingAcks` and `ackTimeouts`
  counters for e2e assertions.

### 2.8 What this deliberately does not do

- No external library (mitt/rxjs/zustand). The bus is ~200 lines of typed TS;
  the ordering/pacing semantics are the hard part and are ours either way.
- No change to outbound actions (`sendAction`), optimistic `pendingAction`
  flow, or the dirty-state pattern in the action panels — they stay on the
  logical track. (Formalizing `pendingAction` as a bus item is a possible
  follow-up, out of scope.)
- No multi-table support; the bus is single-subscription like today's WS.

---

## 3. Implementation plan

Each phase is independently shippable and behavior-preserving until Phase 3.

### Phase 0 — Extract and test the ingest path (no behavior change)
- Pull the body of `ws.onmessage` into a pure module
  `src/bus/ingest.ts`: `classifyMessage(raw) → {kind, snapshot?, format?, variant?, validation?}`.
- Unit tests in `src/bus/ingest.test.ts` covering: gateway state message,
  cosmos `state`/`player_joined_game`/`action_performed`/`game_created`,
  `pending`, `action_accepted`, `error` (incl. `GAME_NOT_FOUND`), old PVM
  `gameStateUpdate`, malformed JSON, validation failure (missing
  format/variant). This retro-fits tests to the currently untested funnel.
- `GameStateContext.onmessage` becomes a thin switch over the classifier.

### Phase 1 — Passthrough queue + envelopes
- Add `GameMessageBus` with seq assignment, FIFO, and an immediate
  (zero-delay) drain. Provider ingests into the bus; commits still land in
  the same `setGameState` calls. Logical track (`setLatestGameState`) moves
  to ingest time.
- Feature flag `VITE_GAME_BUS=off` to fall back to the direct path during
  rollout (flag and fallback removed in Phase 4 — no long-term dual paths).
- Tests: ordering under bursts, reset on resubscribe, error passthrough.

### Phase 2 — Event derivation + `useGameEvents`
- Implement `deriveEvents(prev, next)` in `src/bus/deriveEvents.ts`
  (centralized, heavily unit-tested: new-action detection, multi-action
  gaps, hand rollover, round advance incl. skipped rounds on all-in,
  player join/leave, winner extraction).
- Ship `useGameEvents()`; migrate **`useGameStateSounds`** as the pilot
  consumer (lowest-risk, pure side effect) — delete its ref-diffing.

### Phase 3 — Decorations + paced drain
- Add the `Decoration` pipeline and honor `holdPreviousMs`/`minDisplayMs`
  in the drain; implement backpressure/coalescing per §2.6.
- Ship `showdownHold` (2000ms) and `communityCardStagger` decorators.
- Migrate: `useCardAnimations` (consume animation hints; fixes the
  known turn/river non-retrigger and no-reset-per-hand bugs),
  `usePlayerActionDropBox` and `Badge` action-banner detection.
- Verify `useAutoNewHand` against the paced rendered track: its trigger
  conditions (`hasNewHandAction`, `isUsersTurn`) should read the **logical**
  track so dealing isn't delayed twice; its own 2000ms timer is then removed
  in favor of the `showdownHold` decoration.

### Phase 4 — Cleanup
- Remove the feature flag and the direct path.
- Remove `window.seatJoinNotifications` in favor of `playerJoined` events.
- Remove now-dead ref-diffing from migrated hooks.
- Document the bus in `src/hooks/README.md` and update `CLAUDE.md` data-flow
  section (`WS → Bus (serialize + decorate) → Context → Hooks → Components`).

### Phase 5 — Animation acks (§2.7)
- `ackId`/`ackTimeoutMs` on `AnimationHint`; `bus.ackAnimation()`; drain
  waits `max(minDisplayMs, acks resolved-or-timed-out)`.
- `useAnimationAck` helper; migrate `useCardAnimations` as pilot (ack on
  last flip complete).
- Jest (fake timers): ack-early (commit at `minDisplayMs`), ack-late
  (commit at ack), no-ack (commit at `ackTimeoutMs`), `reset()`/coalescing
  abandon pending acks, non-state kinds unaffected.
- E2e: extend `per-action-frames.spec.ts` (or add `animation-acks.spec.ts`)
  asserting via `__B52_BUS__.pendingAcks`/`ackTimeouts` + commitLog timing
  lower-bounds that the flop commit gated on the stagger completing and
  that `ackTimeouts === 0` in the happy path.

**Suggested sequencing:** Phases 0–1 in one PR (pure refactor + queue),
Phase 2 next, Phase 3 split into (a) pacing engine and (b) per-consumer
migrations, Phase 4 (cleanup), Phase 5 (animation acks) last.

---

## 4. Risks & open questions

| Risk | Mitigation |
|---|---|
| Paced rendered state makes action buttons show stale legal actions | Buttons already read via hooks off `gameState`; audit `useTableState`/`usePlayerLegalActions` in Phase 3 — anything used to *submit* must read the logical track. Cap total queue delay (~4s) so divergence is short. |
| Dirty-state clearing (`actionCount` advance) delayed by pacing → buttons stuck disabled longer | The existing `DIRTY_STATE_TIMEOUT_MS` escape hatch already covers this; optionally clear off logical track. |
| Reconnect bursts flood the queue | §2.6 coalescing; tests simulate a 20-snapshot burst. |
| Replay mode interaction | Bypasses the bus entirely (documented in §2.6). |
| `pendingAction` (optimistic) arriving while a hold is active | Pending items commit immediately (they're UI-slice, not gameState) — unchanged behavior. |
| Hidden consumers relying on instant snapshot commits | Feature flag in Phases 1–3 allows A/B; e2e suite (`packages/e2e`, plays a full hand offline vs the pvm-stub) is the regression gate for hand-flow timing. |

**Open questions (defaults chosen, flag if you disagree):**
1. Should sounds fire at ingest (real-time) or at commit (synced with
   visuals)? **Default: at commit** — audio/visual sync beats 0–2s earlier
   audio.
2. Should the turn timer run off logical or rendered state? **Default:
   logical** — the chain's clock doesn't pause for our animations, and
   showing a shorter-but-honest timer beats a lying one.

---

## 5. Test strategy

### 5.1 Review — what exists today

**Jest unit suite** (`jest.config.js`, jsdom, `@testing-library/react`):
clusters in `src/utils/*.test.ts`, `src/tests/*` (transport/gateway/signing),
and a handful of hook tests (`usePlayerActionDropBox.test.ts`,
`useTurnNotification.test.ts`, ...). **Nothing covers the WS ingest path** —
no test for the `onmessage` handler, `GameStateProvider`, or
`GameDataContext` propagation. Closest are `src/tests/gameTransport.test.ts`
(normalizer unit) and `src/tests/nextActionIndex.test.ts`.

**Playwright e2e** (`packages/e2e`, 7 passing tests, boots the app against
`packages/pvm-stub` — see `docs/plans/2026_07_11_pvm_stub_HANDOFF.md`):

| Spec | Covers |
|---|---|
| `smoke.spec.ts` (3 tests) | boot, funded balance, table renders |
| `play-hand.spec.ts` | join → CALL → CHECK×3 → WINS banner |
| `fold-hand.spec.ts` | FOLD preflop → bot wins banner + FOLD badge |
| `raise-hand.spec.ts` | RAISE preflop + BET flop → showdown |
| `multi-hand.spec.ts` | hand → manual "START NEW HAND" (`?autonewhand=false`) → second hand |

All five gameplay specs are **flow-oriented**: they assert that terminal UI
states appear (buttons, banners) with generous 15s timeouts. None assert
**ordering, timing, pacing, or intermediate states** — the exact properties
the bus introduces.

**pvm-stub** (`packages/pvm-stub`): Hono REST + gateway WS hub. Control
surface is a single `POST /__control/reset` (`server.ts:111`).

### 5.2 Gaps (relative to the bus)

1. **The stub collapses frames.** `broadcast()` has exactly one call site —
   after `applyAction` in `POST /gateway/actions` (`server.ts:91`) — and the
   bot's moves run inside `applyAction` before it. So the UI receives **one
   frame per human action**, while the real gateway streams **one frame per
   action ~150ms apart** (the whole reason ui#443 exists). The stub cannot
   currently reproduce the burst/pacing conditions the bus is being built
   for. This is the biggest gap.
2. **No frame injection.** The stub never emits `event:"pending"`,
   `action_accepted`, `error`/`GAME_NOT_FOUND`, duplicate, out-of-order, or
   malformed frames — so the ingest classifier's non-happy-path branches are
   untestable end-to-end.
3. **No timing assertions in e2e.** Nothing measures "the showdown stayed
   visible ≥ 2s" or "intermediate bot actions were each rendered"; the
   multi-hand spec sidesteps pacing entirely via `?autonewhand=false`.
4. **No provider-level integration test.** Zero tests mount
   `GameStateProvider` against a scripted WS, so serialization behavior
   (bursts → ordered commits) has no harness at any level.
5. **No reconnect coverage.** Unsubscribe/resubscribe mid-hand (queue reset,
   seq continuity, catch-up burst) is untested everywhere.

### 5.3 Stub enhancements (prerequisite work, before Phase 1)

All under the existing `__control` pattern (`server.ts:108`) — no auth, stub
only runs in dev/test:

- **Per-action broadcasting with configurable pacing** —
  `POST /__control/config { frameDelayMs }`: `applyAction` broadcasts a frame
  after **each** engine step (human action, then each bot action) with
  `frameDelayMs` between frames. `frameDelayMs: 150` reproduces the live
  gateway; `frameDelayMs: 0` reproduces a catch-up burst. Default stays
  collapsed (current behavior) so the existing 7 specs are untouched until
  they opt in.
- **Raw frame injection** — `POST /__control/inject { gameId, frame }`:
  sends an arbitrary JSON frame to that game's subscribers. Unlocks e2e for
  `pending`, `error`/`GAME_NOT_FOUND`, duplicate-state, out-of-order-seq,
  and malformed frames.
- **Scripted sequences** — `POST /__control/script { gameId, frames: [{frame, delayMs}] }`:
  replays a recorded frame sequence with timing. This is a cheap slice of
  the never-built M4 "VCR" idea and is what burst/coalescing specs drive.

### 5.4 Bus test-introspection handle (prerequisite, Phase 1)

Visual timing assertions are flaky; the deterministic alternative is to let
tests read the bus's own counters. When not in production build
(`import.meta.env.PROD === false`), the provider exposes
`window.__B52_BUS__: { lastSeq, ingested, committed, coalesced, queueDepth, commitLog: Array<{seq, committedAt}> }`.
E2e asserts serialization numerically (e.g. `commitLog` seqs strictly
increasing, `coalesced === expected`) instead of screenshot-timing. Stripped
from prod builds.

### 5.5 New tests by phase

**Phase 0 — `src/bus/ingest.test.ts` (jest, pure):**
- classifies: gateway `state`, cosmos `state` / `player_joined_game` /
  `action_performed` / `game_created`, old PVM `gameStateUpdate`, `pending`,
  `action_accepted`, `error` + `GAME_NOT_FOUND`, gateway `subscribed` ack
  (ignored), unknown type (ignored), malformed JSON, wrong-table frames.
- validation failures (missing format/variant/gameOptions) → flagged, never
  defaulted (Commandment 7).

**Phase 1 — `src/bus/GameMessageBus.test.ts` (jest, fake timers) + first provider integration test:**
- seq strictly monotonic; FIFO order preserved under a 20-frame synchronous
  burst; commits are strictly serialized (never two in flight).
- `reset()` on resubscribe: queue cleared, seq not reused, stale frames from
  the old subscription dropped.
- logical track updated at ingest even when drain is busy (assert
  `setLatestGameState` mirror sees frame N while render track is at N-k).
- error frames jump the queue.
- **`src/context/GameStateContext.test.tsx`** (new): mount the provider with
  a mock WS (hand-rolled or `jest-websocket-mock`), feed scripted frames,
  assert `useGameData` consumers see ordered snapshots and error/pending
  surfaces. This retro-covers today's untested funnel and pins behavior
  before pacing lands.

**Phase 2 — `src/bus/deriveEvents.test.ts` (jest, pure — the highest-value suite):**
- one `playerActed` per new `previousActions` entry, including multi-action
  gaps (frame skipped/coalesced upstream → 3 new actions in one diff).
  **Action indices are globally monotonic across hands** (verified against a
  live frame, `docs/sample-gamestate.json`: hand 4's actions run index 34+
  atop `actionCount: 33`) — dedup by a single persistent `lastSeenIndex`, no
  per-hand reset.
- hand rollover: `handNumber` advance → `handStarted`; the `previousActions`
  *array* is replaced with only the new hand's actions (starting with
  `post-small-blind`/`post-big-blind`/`deal`, round `"ante"`) while indices
  continue globally — no phantom `playerActed` from the array shrinking.
- non-player actions (`deal`, blind posts) surface as `playerActed` with
  `NonPlayerActionType` — decorators must distinguish them from voluntary
  actions (deal → hole-card animation, blinds → chip animation).
- `cardsRevealed`: opponent `holeCards` transition from `["X","X"]` to real
  cards at showdown (frames are per-viewer masked; `deck: "X"`).
- `roundAdvanced` incl. all-in runouts that skip betting rounds; correct
  `newCommunityCards` for flop (3), turn (1), river (1).
- `handEnded` winner extraction; `playerJoined`/`playerLeft`; regressed
  snapshot without hand change → validation error, not silent acceptance.
- `useGameEvents` renderHook test; port `useGameStateSounds` expectations to
  event-driven form (sound per remote `playerActed`, none for local, none
  replayed on hand rollover).

**Phase 3 — decorator + drain pacing (jest, fake timers):**
- each decorator pure-unit-tested (`showdownHold` sets `minDisplayMs: 2000`
  only on `handEnded`; `communityCardStagger` only on `roundAdvanced` with
  new cards; `remoteActionSound` skips local seat).
- drain honors `holdPreviousMs` then `minDisplayMs`; next commit is delayed
  by exactly `max(minDisplayMs, animation acks)`.
- coalescing: burst past depth cap drops only `coalescible` items, never
  `handEnded`; compressed holds under sustained pressure; final state always
  converges to newest frame.

**New e2e specs (Playwright, using §5.3 controls + §5.4 handle):**

| Spec | Drives | Asserts |
|---|---|---|
| `per-action-frames.spec.ts` | `frameDelayMs: 150` (live-gateway fidelity), play `play-hand` flow | each bot action's badge/sound event observed (via `__B52_BUS__.commitLog` + badge visibility), commits strictly ordered — **this becomes the new marquee spec** |
| `burst-catchup.spec.ts` | `__control/script` replays a full hand's frames at `delayMs: 0` | UI lands on final snapshot, `coalesced > 0`, `handEnded` frame was committed (never dropped), zero page errors |
| `showdown-hold.spec.ts` | full hand with autonewhand **on** (pacing path) | WINS banner visible ≥ ~1.8s (measured between banner-visible and next-hand hole cards; lower bound only, to stay unflaky) |
| `pending-frame.spec.ts` | `__control/inject` an `event:"pending"` frame | pending-action UI appears immediately (jumps any active hold) |
| `error-frame.spec.ts` | inject `error` + `GAME_NOT_FOUND`; plus direct `POST /gateway/actions` with unknown gameId | error surface shown immediately; server returns 422 (the server-level spec deferred in the handoff doc) |
| `duplicate-frame.spec.ts` | inject the same state frame twice | `committed` increments once beyond baseline / no double badge or sound event |
| `reconnect.spec.ts` | mid-hand: drop WS (stub closes socket), UI resubscribes | catch-up frame renders, seq continuity in `commitLog`, no stale-frame commit |

Existing 5 gameplay specs stay green **unmodified** through Phases 0–2
(passthrough guarantee) and are re-run against the paced drain in Phase 3 —
they are the regression gate that pacing never deadlocks hand flow.
`multi-hand.spec.ts` (autonewhand off) specifically guards that manual flow
ignores `showdownHold` double-delay.

### 5.6 Environment gotchas (learned during Phase 0–1)

- **`VITE_SHOW_BANNER` gap:** the e2e specs assume `VITE_SHOW_BANNER=true`
  (smoke.spec.ts), but `ui/.env` doesn't set it — all banner-dependent specs
  fail on a fresh checkout regardless of code changes. Boot the dev server
  with it set (or fix properly: committed `.env.e2e` or the playwright
  `webServer.command`). Should be fixed alongside the §5.3 stub work.
- **`yarn build` is red on `main`** independent of this work:
  `useSitAndGoPayouts.ts` references `PayoutPlaceDTO` / `state.payouts`,
  which the installed `@block52/poker-vm-sdk` doesn't export (stale SDK).
  Verified identical on clean main. The build gate for Phases 2–3 means "no
  *new* type errors" until the SDK is bumped.

### 5.7 Gate per phase

- **Phase 0–1:** new jest suites green + all 7 existing e2e green with flag
  on **and** off.
- **Phase 2:** `deriveEvents` suite green; `per-action-frames` +
  `duplicate-frame` e2e added and green.
- **Phase 3:** pacing/coalescing jest suites green; full e2e matrix
  (existing 7 + all new specs) green; `showdown-hold` replaces reliance on
  the `useAutoNewHand` timer before that timer is deleted in Phase 4.

## 6. References

- `src/context/GameStateContext.tsx:174-298` — current onmessage funnel
- `src/utils/gameTransport.ts` — transport selection + gateway normalization
- `src/hooks/playerActions/transportAction.ts:29-31` — logical-track mirror
- `src/hooks/playerActions/useAutoNewHand.ts:10` — ui#443 showdown hold (pacing precedent)
- `src/hooks/player/usePlayerActionDropBox.ts`, `src/hooks/notifications/useGameStateSounds.ts`, `src/hooks/animations/useCardAnimations.ts` — ref-diffing consumers to migrate
- ui#440 (gateway transport), ui#443 (showdown hold), poker-vm#2224/#2226 (gateway WS contract)
