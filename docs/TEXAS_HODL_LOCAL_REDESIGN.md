# Texas HODL UI branding and local development

This repository is the public `TexasHODL/ui` frontend. `main` is deployed to [play.texashodl.net](https://play.texashodl.net/) by DigitalOcean. See [`TEXAS_HODL_RELEASE.md`](TEXAS_HODL_RELEASE.md) for how releases and upstream syncs work.

The October 2026 redesign that first landed this look started as a local preview. That work is now on `main` and in production. The dated checklists and preview notes from that pass are archived in [`archive/TEXAS_HODL_LOCAL_REDESIGN-2026-10.md`](archive/TEXAS_HODL_LOCAL_REDESIGN-2026-10.md).

## Visual direction

- [texashodl.net](https://texashodl.net) is the visual source of truth: near-black surfaces, thin borders, large geometric type, purple signal glows, and orange-to-pink action gradients.
- PlayBlind is used only as an interaction reference for table discovery, seat clarity, table state, and action hierarchy. Its visual palette and branding are not copied.
- Gameplay, wallet, WebSocket, and chain behavior stay in the existing components; branding work should not replace those hooks or handlers.

## Networks

The built-in default node is Block52 (`node1.block52.xyz`):

- REST: `https://node1.block52.xyz`
- RPC: `https://node1.block52.xyz/rpc/`
- WebSocket: `wss://node1.block52.xyz/ws`

The Texas Hodl node stays in the selector (do not treat it as a disposable test network):

- REST: `https://node.texashodl.net`
- RPC: `https://node.texashodl.net/rpc/`
- WebSocket: `wss://node.texashodl.net/ws`
- Selector name: `Texas Hodl`

A local `yarn dev` client can see the same multiplayer tables as the live site when it uses one of these networks. Taking seats, betting, creating or closing tables, and wallet actions can still change shared state and involve real funds. Do not perform those actions unless you intend to.

Removing `VITE_DEFAULT_NETWORK` from `.env.local` leaves the Block52 default. To start on the Texas Hodl node instead, set `VITE_DEFAULT_NETWORK=Texas Hodl`. The in-app network selector can also change the node; that choice is saved on the device.

## Run locally

The repository pins Node 22.13.0 and Yarn 1.22.22. Newer Node versions may serve and build the UI, but Cosmos SDK compatibility past the pinned version is not certified here, and the runtime declarations should not be changed as part of ordinary UI work.

```text
yarn install
yarn dev
```

Then open `http://localhost:5173`. Saved UI edits update automatically.

For a member test, everyone needs the same network and table ID. Other players can use the live site at [play.texashodl.net](https://play.texashodl.net/) while you use a local build; they will not see your unpublished UI changes. A `localhost` / `127.0.0.1` invitation only works on the computer running the preview.

## Display amounts

Lobby, table, wallet, history, and explorer labels use display rounding. Tournament chips, percentages, ETH values, and raw diagnostic micro-units keep their own formatting.

Display rounding must never be parsed back into transactions. Editable buy-in, Max, and slider formatting stay separate from fee, affordability, payout, and transaction calculations. A rounded component fee may differ by a cent from an independently rounded total.

## Shared UI conventions that came from the redesign

These are current conventions, not a pending local-only experiment:

- Shared page shell and headings on secondary pages (My hands, Wallet, More, explorer, admin).
- Shared `ModalHeader` (Texas HODL logo, left-aligned title and subtitle, in-flow close control when the dialog is dismissible). Third-party wallet and payment dialogs stay outside this app-owned styling.
- Lobby as the primary game-discovery destination; Tables lives under More. Creation receipts are shown instead of silently dismissing the form.
- Desktop table History and Settings share one side panel; History is the default persistent view. Full screen is a local table-only view (banners hide, action controls stay mounted; Show controls or Escape restores banners), not the browser Fullscreen API.
