# @block52/pvm-stub

Local stub server so the UI runs **with no chain, funds, or bridge**. Modeled on
`dynamiq/h3-portal/packages/api-stub`.

Full design: [`ui/docs/plans/2026_07_11_wallet_stub_server.md`](../../docs/plans/2026_07_11_wallet_stub_server.md).

## Run

```bash
# from ui/
yarn stub                 # -> http://localhost:8546

# or from here
cd packages/pvm-stub && yarn && yarn start
```

## Point the UI at it

1. `.env`: `VITE_GATEWAY_URL=http://localhost:8546/gateway`
2. In the app's network dropdown (top-right), select **Stub**.

Your `/wallet` page should now show a funded USDC balance.

## Config (env)

| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `8546` | listen port |
| `STUB_USDC` | `1000000000` | USDC balance in 6-decimal microunits (1000 USDC) |
| `STUB_STAKE` | `1000000000` | stake (gas) balance |

## Status

- **M1 (done):** funded balance + health probes.
- **M2 (done):** seeded lobby (`list_games`) + `game_state` + gateway WS (`/gateway/ws`,
  subscribe → state) + `POST /gateway/actions` echo. A table shows in the lobby, opens, and
  renders — but the seeded hand is static (no play yet).
- **M3 (next):** `holdem.ts` synthetic engine + auto-bot — actually play a hand. Then VCR
  record/replay. See the plan.
