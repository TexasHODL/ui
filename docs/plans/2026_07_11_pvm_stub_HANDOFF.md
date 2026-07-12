# pvm-stub + e2e — Handoff / Resume (read this first)

Companion to the design doc: `2026_07_11_wallet_stub_server.md`. This is the "pick up
after a context clear" cheat-sheet.

## Where it stands (2026-07-11)

**M1–M3 shipped and green, plus the expanded gameplay-spec suite.** The UI plays hands
end-to-end against a local stub — funded wallet → sit down → play — driven by Playwright,
no chain/funds/bridge. **7/7 e2e tests pass** (3 smoke + 4 gameplay). **VCR record/replay
(M4–M5) NOT built.**

Gameplay specs (packages/e2e/tests/):
- `play-hand.spec.ts` — CALL then CHECK down to showdown (the original marquee).
- `fold-hand.spec.ts` — FOLD preflop → opponent (bot) wins; asserts WINS banner + our FOLD badge.
- `raise-hand.spec.ts` — RAISE preflop + BET the flop (both are `.btn-raise`, disambiguated by
  label text), check down to showdown.
- `multi-hand.spec.ts` — play a hand, then start the next via the manual "START NEW HAND"
  button (`[data-action="new-hand"]`, with `?autonewhand=false`), play it too.

Engine changes that unlocked these (holdem.ts):
- Showdown now lands on round `"end"` (was `"showdown"`), sets `nextToAct = human`, and the
  human's `legalActionsFor` returns a `{action:"new-hand"}` — so the UI's `useAutoNewHand` /
  manual button can cycle into the next hand. `startHand` carries stacks forward.
- Bot cards stay revealed through `"end"` (not just `"showdown"`).
- `applyAction` handles the `"new-hand"` action (deals the next hand from END).

Not done — **illegal-action error toast (422)**: the stub already returns 422 for unknown
gameIds, but the UI's action-submit path only `console.error`s on failure (no toast — verified
in PokerActionPanel.tsx). So an "error toast" e2e isn't achievable without changing product UI;
skipped by design. A server-level 422 assertion (direct POST) is the only faithful option.

## Layout

```
ui/                                 # workspace root (app UNMOVED; just added "workspaces": ["packages/*"])
  .env                              # VITE_GATEWAY_URL -> http://localhost:8546/gateway (prod line commented)
  src/context/NetworkContext.tsx    # NETWORK_PRESETS[4] "Stub" (rest/rpc = localhost:8546) -> shows in dropdown
  packages/pvm-stub/                # @block52/pvm-stub — the fake backend
    src/server.ts                   # Hono: health, balance, list_games, game_state, POST /gateway/actions,
                                    #       cosmetic reads, POST /__control/reset; attaches gateway WS
    src/holdem.ts                   # the poker engine + auto-bot + in-memory store (the real logic)
    src/gateway-ws.ts               # WS hub: subscribe -> {type:"state"} broadcasts
    src/state.ts                    # thin adapter re-exporting holdem.ts under server's import names
  packages/e2e/                     # @block52/e2e — Playwright
    playwright.config.ts            # boots stub+dev via webServer (reuseExistingServer), baseURL :5173
    tests/fixtures.ts               # seeds wallet + Stub network into localStorage; resets stub per test
    tests/smoke.spec.ts             # boot / funded balance / table renders (3 tests)
    tests/play-hand.spec.ts         # THE full-hand test (join -> CALL -> CHECK x3 -> WINS)
```

## Run it

```bash
nvm use 22                                   # REQUIRED: app pins node 22.x; root yarn scripts enforce it
corepack yarn install --ignore-engines       # if deps missing (--ignore-engines only needed on node<22)
corepack yarn stub                           # -> :8546  (= yarn workspace @block52/pvm-stub start)
corepack yarn dev                            # -> :5173  (reads .env gateway url)
corepack yarn workspace @block52/e2e test    # runs all e2e (auto-boots servers if not running)
corepack yarn workspace @block52/e2e test:headed   # watch it play
# one-time: corepack yarn workspace @block52/e2e install-browsers   (chromium already installed)
```

## Gotchas that cost time (don't rediscover)

- **node 22 or bust.** My shell defaults to node 20; use `nvm use 22`. `yarn install` needs
  `--ignore-engines` on node<22. Playwright/servers should run on 22.
- **chrome-devtools MCP can't attach** — it wants its own browser and conflicts with a
  running Chrome. That's WHY we went Playwright.
- **e2e clicks Seat 5**, not 1 — seats 1–2 sit behind the footer action panel (pointer
  interception). The engine seats the human wherever they click.
- **`getByText` strict mode**: `/Buy-In/i` matched both the modal title and a label → target
  unique text/buttons.
- **`list_games` returns `games` as a JSON-ENCODED STRING**, not an array (verified vs live node1).
- **WS must reply `state` within 5s** of `subscribe` or GameStateContext errors.
- **Test wallet** (deterministic): mnemonic `legal winner thank year wave sausage worth useful legal winner thank yellow`
  → `b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93`.
- **CASH_GAME_ID** = `0x00000000000000000000000000000000000000000000000000000000cafe0001`.
- **`POST /__control/reset`** clears game state — fixtures call it per test for isolation.
- **Header shows $0.00 but the buy-in modal shows $1000.00** — the modal read is correct
  (funded); the header is a separate lagging display, not a bug in the stub.

## Engine simplifications (intentional — "exercise the UI", not real poker)

In `holdem.ts`: human is always dealer/SB and **acts first every street**; the bot only
**checks/calls**; at showdown **the human always wins**; legal actions are permissive.
Good enough to drive every UI surface; NOT rules-accurate.

## Next up

Gameplay-spec expansion is DONE (fold / raise+bet / multi-hand — see above). Remaining ideas:
- **M4 VCR** (record a real session, replay offline) — not started.
- A **varied bot** (currently only checks/calls; at showdown the human always wins unless the
  bot is the sole survivor via a fold). Would enable bet-facing/raise-war and non-human-win specs.
- A **server-level 422 spec** for illegal actions (the UI can't surface it as a toast; see above).

## Housekeeping

- Restore `.env` `VITE_GATEWAY_URL` to the commented prod line to play on the live network.
- Servers may still be running on :8546 / :5173 from this session.
