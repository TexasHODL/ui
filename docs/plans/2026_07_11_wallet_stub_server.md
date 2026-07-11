# 2026-07-11 — Wallet Stub Server (`@block52/pvm-stub`)

**Status:** M1–M3 shipped ✅ (funded wallet → play a full hand, driven by Playwright e2e).
VCR record/replay (M4–M5) still planned. Package renamed `wallet-stub` → **`@block52/pvm-stub`**
(it stubs the gateway + cosmos REST + a poker engine, not just the wallet). E2e tests live in
`packages/e2e`. Workspace decision (§4): resolved to **yarn workspaces** (`ui` app unmoved).
**Author:** Sam
**Goal:** Stand up a standalone stub-server **package** so the UI runs end-to-end —
funded wallet, sit down, play a full hand — with **no real chain, no funds, no bridge**.
Modeled closely on `dynamiq/h3-portal/packages/api-stub`, whose VCR record/replay + proxy
+ control-surface machinery is domain-agnostic and copies over largely as-is.

---

## 1. Motivation

Testing gameplay today needs either a real USDC bridge deposit on the live network, or a
locally-run pokerchain funded from genesis. Both are heavyweight for iterating on UI. A
stub package replaces the two backend surfaces the wallet/gameplay flow depends on so
`yarn dev` against it gives a funded wallet and a working table immediately — and, in VCR
mode, replays *real* recorded backend responses offline.

## 2. Committed direction — synthetic engine, tuned to exercise the UI

**Goal (decided 2026-07-11): exercise the UI by clicking through a whole hand yourself,
offline, no funds, no chain toolchain.** This makes the **synthetic `holdem.ts` engine the
primary deliverable** — VCR replay can only re-play a captured session, not let you take
arbitrary actions, so it can't meet this goal on its own.

**Fidelity bar is "drive the UI", not "rules-accurate poker".** Because the target is
exercising UI surfaces (not validating game logic), `holdem.ts` only needs
coherent-*enough* state so every component renders and responds through a hand:
blinds posted → hole cards dealt → betting controls with legal actions → flop/turn/river
board → pot updates → showdown + winner display → next hand. Permissive legal actions,
trivial winner selection, and a dumb bot are all acceptable.

**A hand needs ≥2 players, so the stub fills the empty seat(s) with an auto-bot.** Playing
"yourself" means one human seat; the stub seats 1+ bots that auto **check/call** (never
initiate, never fold unless facing an all-in) so the hand always advances to showdown
without a second human. This is part of `holdem.ts`.

**VCR mode stays in the plan (per the api-stub port) but is secondary** — useful for
capturing real DTO shapes to seed the engine, and for regression-replay of a real hand. It
is **not** on the critical path for the primary goal and lands in a later phase (§8, M5).

| Mode | Interactive? | Role in this plan |
|------|--------------|-------------------|
| **Synthetic engine** (`holdem.ts` + auto-bot) | Yes — any action → next state | **Primary.** Click through a full hand solo. |
| **VCR replay** (recorded cassette) | No — deterministic playback | Secondary/later: DTO-shape capture, regression-replay. |

## 3. Why the UI is stub-friendly (verified 2026-07-11)

| Fact | Location | Consequence |
|------|----------|-------------|
| All actions route through the gateway | `CHAIN_ANCHORED_ACTIONS = new Set([])`, `transportAction.ts:74` | Join/bet/deal/new-hand all POST to the gateway; nothing goes chain-direct. |
| Gateway is the default transport | `getGameTransport()`, `gameTransport.ts:17` | Stub the gateway and you own the whole action path; no flag flip. |
| Actions authorized by EIP-191 signature | `signActionMessage`, `transportAction.ts:119` | Signing needs only the localStorage mnemonic — **no funds, no on-chain account**. |
| Settlement tx is best-effort | try/catch, `transportAction.ts:135-140` | Unfunded accounts log "tx signing skipped" and proceed. Stub ignores `tx`. |
| Balance is plain REST | SDK `getAllBalances` → `GET /cosmos/bank/v1beta1/balances/{address}`; read in `useCosmosWallet.ts:72`, gated in `BuyInModal.tsx:63` | A single JSON REST response unlocks buy-in. |
| Gateway ack carries post-action state | `GatewayActionResponse.state`, `GatewayApi.ts` | The synthetic engine returns next-state synchronously — ideal for a stub. |
| WS state shape is well-defined | `normalizeGatewayMessage`, `gameTransport.ts:68` | Broadcasts must be `{type:"state", gameId, state:{format,variant,gameState}}`. |

The stub only impersonates (1) the gateway HTTP+WS and (2) a handful of Cosmos REST
endpoints. It does **not** need Tendermint RPC, protobuf, or a chain.

## 4. Package layout — `packages/pvm-stub`

`ui` is a single-package yarn-classic repo (no workspaces today). Setup:

1. Add `"workspaces": ["packages/*"]` to `ui/package.json` (yarn 1 supports this), or run
   the stub as a fully standalone dir with its own lockfile — **decision below**.
2. Create `packages/pvm-stub/` mirroring `api-stub`:

```
packages/pvm-stub/
  package.json            # name @block52/pvm-stub, type module, tsx scripts
  tsconfig.json
  cassettes/              # committed VCR recordings (README + <label>/index.json)
  src/
    server.ts             # entrypoint — routes gateway + cosmos, boots WS hub  [copy+adapt]
    engine.ts             # match/record + deriveGatewayBroadcast              [copy+adapt]
    holdem.ts             # NET-NEW: minimal in-memory hold'em state machine
    gateway-ws.ts         # WS hub: subscribe→state broadcasts (was signalr.ts)[copy+adapt]
    cassette.ts           # VCR cassette format (json/text inline, binary refs) [copy ~verbatim]
    proxy.ts              # transparent record proxy, streams + tees            [copy ~verbatim]
    ws-record.ts          # bridge+tee gateway WS frames into cassette          [copy+adapt frame parse]
    record.ts             # `yarn record` entrypoint                           [copy+adapt]
    upstream.ts           # map /gateway/* and /cosmos/* to real upstreams      [copy+adapt]
    scrubber.ts           # strip mnemonic/signature/bearer before write        [copy+adapt patterns]
    control.ts            # /__control/*: set balance, seed table, force state  [copy+adapt verbs]
    flows/                # seeded scenarios (funded-wallet, seeded-cash-table…) [new content, same shape]
```

Deps (same as `api-stub`): `hono`, `@hono/node-server`, `ws`, dev `tsx` + `typescript` +
`@types/*`. Optionally `json-schema-faker` (as `api-stub` uses in `generate.ts`) to
synthesize DTOs from SDK JSON schema.

Scripts: `start` (synthetic), `start:cache` (`STUB_CACHE=1`, replay+proxy), `record`,
`dev` (`tsx watch`), `typecheck`.

> **Open decision — workspace vs. standalone.** Recommend enabling yarn workspaces so the
> stub can `import type` DTOs from `@block52/poker-vm-sdk` for shape-honesty (Commandment
> #1). If we want zero root churn, keep it standalone with its own deps and duplicate the
> few DTO types — but that risks drift. **Recommendation: workspace.**

## 5. What copies vs. what changes

**Copy ~verbatim** (domain-agnostic VCR core):
- `cassette.ts` — VCR format: entries keyed by `method + path` (query stripped), JSON/text
  inline in `index.json`, binary in `bodies/`, replayable via `loadCassetteAsStubs`.
- `proxy.ts` — streams the real upstream response back unbuffered while teeing a scrubbed
  copy into the cassette (`response.body.tee()`); never records a fabricated success.
- The precedence + recording spine of `engine.ts` (`matchStub`, `resolveAndRecord`,
  fixtures > flow > default, `getRecordedCalls`).
- `control.ts` skeleton (`/ready`, `/reset`, `/fixtures`, `/flow`, read-back).

**Adapt:**
- `upstream.ts` — resolver routes `/gateway/*` → real gateway (`pvm.block52.xyz/gateway`),
  `/cosmos/*` + `/block52/*` → real cosmos REST node. (`api-stub` split api/identity/assistant.)
- `engine.ts::deriveSignalRPushes` → **`deriveGatewayBroadcast`**: `POST /gateway/actions`
  advances `holdem.ts` and emits a `{type:"state"}` WS broadcast — the direct analog of
  `POST /api/AiApi/notification → SignalR push`.
- `signalr.ts` → **`gateway-ws.ts`**: on WS connect handle `subscribe {gameId}` → reply
  `{type:"subscribed"}`, then push `{type:"state", gameId, state}` frames. (`api-stub`
  replays legacy SignalR 2.x `M[]` envelopes; ours is the simpler gateway JSON.)
- `ws-record.ts::teeFrame` — parse gateway `{type:"state"...}` frames instead of SignalR
  `M[]`; the bridge/tee plumbing is unchanged.
- `scrubber.ts` — scrub patterns become mnemonic / EIP-191 `signature` / `Bearer` /
  base64 `tx`, rather than emqnet auth cookies.

**Net-new:**
- `holdem.ts` — minimal state machine: seat/blinds/deal/legal-actions/street-advance/award.
  Produces `GameStateResponseDTO` snapshots. Fidelity bar is "drive the UI" (§2), so legal
  actions may be permissive and winner selection trivial (SDK `evaluateShowdown` when handy).
  **The only real domain logic.**
- `bot.ts` — dumb auto-opponent so a solo human can complete a hand: after any state change
  where `nextToAct` is a bot seat, it auto **check/calls** (folds only vs. an all-in it
  can't cover) and re-enters the engine, emitting the resulting broadcast. Without this a
  one-human table never advances past the first decision.

## 6. Endpoint contract

- `GET /gateway/health` → `{"status":"ok"}` (`GatewayApi.health`).
- `POST /gateway/actions` (body = `GatewayActionRequest`): ignore `signature`/`tx`, apply
  `{action, amount, index, address, data}` to `holdem.ts`, broadcast new state on the WS,
  return `200 {type:"ack", gameId, index, state}`; `422 {type:"error", error}` on illegal
  action (exercises the UI error toast).
- `WS /gateway/ws`: `subscribe {gameId}` → `{type:"subscribed"}`; push `{type:"state",
  gameId, state:{format,variant,gameState}}` on change (satisfies `normalizeGatewayMessage`).
- `GET /cosmos/bank/v1beta1/balances/:address` →
  `{"balances":[{"denom":"usdc","amount":"1000000000"},{"denom":"stake","amount":"1000000000"}]}`.
- `GET /block52/pokerchain/poker/v1/game_state/:gameId` → current `GameStateResponseDTO`.

> DTO field types follow the 12 Commandments: bigint fields as **strings** (`stack`,
> `amount`, `smallBlind`, `bigBlind`, pots, legalAction min/max), safe-int fields as
> **numbers** (`seat`, `dealer`, `handNumber`, `actionCount`, `index`, `timestamp`).
> Import DTO types from `@block52/poker-vm-sdk` to keep shapes honest.

## 7. UI configuration (no UI code changes)

```bash
VITE_GAME_TRANSPORT=gateway                 # already default
VITE_GATEWAY_URL=http://localhost:8546/gateway
```
Add a **`Stub`** network preset in `NETWORK_PRESETS` (`NetworkContext.tsx`) with `rest`
→ `http://localhost:8546`; `rpc` can point anywhere (settlement RPC is swallowed).

## 8. Milestones

Primary goal (§2) is reached at **M3**. M4–M5 are the VCR/polish tail, not on the critical path.

1. **M1 — Package + balance.** Scaffold `packages/pvm-stub`, Hono server, `/health`,
   cosmos balance endpoint, `Stub` preset. Acceptance: `/wallet` shows 1000 USDC.
2. **M2 — Lobby + gateway actions + WS, static state.** Serve the endpoints the M1 run
   showed the UI actually calls (all returned `{}` and logged `UNSTUBBED`):
   - `GET /block52/pokerchain/poker/v1/list_games` → **≥1 seeded table** (else the lobby is
     empty and there's nothing to join). **Highest priority.**
   - `GET /block52/pokerchain/poker/v1/game_state/:gameId` → a fixed `GameStateResponseDTO`.
   - `GET /cosmos/base/tendermint/v1beta1/blocks/latest`, `.../cosmos/tx/v1beta1/txs`,
     `/pokerchain/poker/nft_avatar/:addr` → benign shapes (cosmetic; stop the `{}` noise).
   - `POST /gateway/actions` echoes the fixed state; `/gateway/ws` broadcasts it.
   Acceptance: a table shows in the lobby, opens, renders; an action acks and the UI updates
   from the WS broadcast.
3. **M3 — `holdem.ts` engine + `bot.ts` (★ primary goal).** Seat/blinds/deal/legal-actions/
   street-advance/showdown, plus the auto check/call bot. **Acceptance: buy in, sit down,
   and click through a whole hand yourself to showdown + next hand — every betting/board/pot/
   winner surface renders and responds.** No chain, no funds.
4. **M4 — VCR record/replay (secondary).** Port `proxy.ts`/`cassette.ts`/`ws-record.ts`/
   `record.ts`; `yarn record` captures a real session; replay offline. Acceptance: a recorded
   hand replays with no chain/funds.
5. **M5 — Cache mode + control surface + flows.** `STUB_CACHE=1` (replay-or-proxy),
   `/__control` (set balance, seed table, force state), seeded flows. Polish + README.

## 9. Acceptance criteria

**v1 (primary goal — through M3):**
- `yarn workspace @block52/pvm-stub start` + `yarn dev` (with the two env vars) →
  - `/wallet` shows a funded USDC + stake balance.
  - Buy in via `BuyInModal` (no "insufficient funds"), sit down.
  - **Click through a complete hand solo vs. the auto-bot** — preflop → flop → turn → river
    → showdown → winner → next hand — with the UI updating from each ack **and** WS broadcast.
  - **Turn-notification fires solo:** background the tab during the bot's action; when the
    stub flips `nextToAct` back to your seat, the favicon flashes + chime plays
    (`useNextToActInfo` → `useTurnNotification`, `docs/TURN_NOTIFICATION_TESTING.md`). This
    feature normally needs two joined windows — the stub makes it a one-window test.
  - An illegal action surfaces the gateway error toast (`422` path).

**Later (VCR — through M4):**
- `yarn workspace @block52/pvm-stub record` captures a real session to a cassette; that
  cassette then replays a hand with **no chain, funds, or network**.

## 10. Risks / open questions

- **State-machine fidelity vs. effort** — v1 `holdem.ts` targets "enough to advance a hand";
  document divergences (winner logic, side pots) so tests don't assume real showdown.
- **Action-index bookkeeping** — the UI computes next `index` from `legalActions[].index`
  (see the ui#440 join-index note in `transportAction.ts`); the stub must return correct
  indices even though it won't itself reject a wrong one.
- **`nextToAct` drives several UI features** — turn highlighting, action controls, and the
  turn-notification favicon/chime (`useNextToActInfo` → `useTurnNotification`) all key off
  `nextToAct`. The engine must set it precisely each transition (bot seat while the bot
  acts, human seat when it's their turn) or these surfaces misfire.
- **VCR interactivity limit** — replay ≠ free play; keep VCR for reads/regression, synthetic
  for interactive. Don't over-invest in recording the action path.
- **Scrubber completeness** — cassettes are committed; the scrubber is the hard pre-commit
  gate for mnemonic/signature/tx/bearer. Get this right before the first `record`.
- **DTO drift** — build snapshots from SDK types where feasible; add a smoke test feeding a
  stub `state` frame through `normalizeGatewayMessage`.
- **Workspace vs. standalone** (§4) — recommend workspace for SDK type imports.

## 11. References

- Source to port: `dynamiq/h3-portal/packages/api-stub` — `server.ts`, `engine.ts`
  (`resolveAndRecord`/`deriveSignalRPushes`), `cassette.ts`, `proxy.ts`, `ws-record.ts`,
  `control.ts`, `record.ts`, `upstream.ts`, `scrubber.ts`, `signalr.ts`, `flows/*`.
- UI seams: `src/utils/gameTransport.ts`, `src/apis/GatewayApi.ts`,
  `src/hooks/playerActions/transportAction.ts`, `src/hooks/wallet/useCosmosWallet.ts`,
  `src/components/modals/BuyInModal.tsx`, `src/context/NetworkContext.tsx`.
- CLAUDE.md — The 12 Commandments of Types (DTO string/number rules).
