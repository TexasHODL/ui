# Texas HODL local UI redesign

This checkout is a local-only redesign workspace for the public `TexasHODL/ui` frontend. It is not connected to a deployment workflow and nothing here is pushed or published.

## Current direction

- Lobby and table UI are being redesigned together.
- `texashodl.net` is the visual source of truth: near-black surfaces, thin borders, large geometric type, purple signal glows, and orange-to-pink action gradients.
- PlayBlind is used only as an interaction reference for table discovery, seat clarity, table state, and action hierarchy. Its visual palette and branding are not being copied.
- Gameplay, wallet, WebSocket, and chain behavior remain in the existing components.

## Local network

`.env.local` defaults the local build to the shared Texas HODL network (do not assume it is a disposable test network):

- RPC: `https://node.texashodl.net/rpc/`
- WebSocket: `wss://node.texashodl.net/ws`
- Default network selector: `Texas Hodl`

This keeps a local UI capable of seeing the same multiplayer tables as the live client. It does not change the live frontend. Taking seats, betting, creating/closing tables and wallet actions can still change shared state and involve real funds. No such actions were performed during this redesign pass.

For a member test, players need the same network and table ID. Other members can use the live frontend while you use the local frontend; they will not see your redesigned UI. A localhost/127.0.0.1 invitation only works on the computer running the preview. This preview is not publicly hosted.

## Run locally

The repository pins Node 22.13.0 and Yarn 1.22.22. The current installed Node 24.21.0 successfully served and built this UI, but the repository warns about Cosmos SDK compatibility beyond the pinned version. Financial/gameplay compatibility on Node 24 has not been certified, and the runtime declarations were not changed.

With dependencies already installed, the locally verified launch command is:

```powershell
cd "C:\Users\andre\Documents\Codex\2026-10-09\i-w\texas-hodl-ui"
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Keep that terminal open and visit `http://127.0.0.1:5173`. Saved UI edits update automatically.

For a fresh install using the repository's pinned runtime:

```text
yarn install
yarn dev
```

Then open `http://localhost:5173`.

Texas Hodl is now the built-in default network, so removing `VITE_DEFAULT_NETWORK` from `.env.local` still gives Texas Hodl. To use Block52 instead, set `VITE_DEFAULT_NETWORK=Block52`. The network selector can also be changed in the app.

## Visual work completed

- Repointed the shared theme defaults and local environment to Texas HODL colors.
- Restyled the dashboard/lobby surfaces and table list without replacing their data hooks.
- Restyled the table felt, rail, headers, sidebars, pot display, and action controls while preserving table geometry and game-state wiring.
- Added local CSS tokens for the shared Texas HODL visual language.

## October 11 simplification pass

- Simplified shared navigation to Lobby, My hands, Wallet, and More.
- Built a game-first lobby with format filters, search, an open-seat filter, sorting, occupancy indicators and pagination.
- Distinguished opening a table from joining it; full tables are labelled Watch.
- Kept balances and funding accessible in a compact wallet, with address and activity tucked into disclosures.
- Rebuilt the desktop table header around Lobby, Invite, History and Settings. Network, wallet and sharing extras are in menus.
- Added accessible native seat buttons, clearer seat labels, muted purple felt and quieter stack badges.
- Moved desktop table appearance into Settings and added a close control.
- Preserved the existing game-state hooks, join/buy-in flow, betting handlers and responsive seat geometry.

## Verification

- TypeScript build and Vite production build passed.
- 15 focused tests passed: lobby filters, table-header handlers, settings controls and existing pot-sized bet tests.
- Browser checked: desktop lobby/table; 390px-wide lobby/table without horizontal overflow; search/no-results/reset; format and open-seat filtering; History, Settings and table-options menus; seat buy-in modal opening and cancellation. No join confirmation or fund movement.
- Existing PlayerActionButtons and MobileTableHeader suites stop before assertions because their Jest import chain encounters `import.meta.env` in NetworkContext.
- ESLint is blocked by the installed TypeScript/parser combination (`typescript-estree` fails while reading `Cjs`). Dependencies were left unchanged.
- Build retains upstream dependency/bundle-size warnings and an unset `VITE_APP_IMAGE` warning.

## October 11 account and secondary-page consistency pass

- Added a shared page shell and heading: lobby-style spacing, restrained purple ambient light, near-black panels, thin borders, readable type and visible keyboard focus.
- My hands now has a clearer empty state and a direct route back to finding a table; existing history, indexing and replay data remain wired in.
- Wallet separates the game wallet from the external funding wallet. Recovery/backup and device removal are collapsed by default. Wallet generation, import, connection and removal handlers remain connected; tests use mocked wallets, never real keys.
- Grouped More into Explore, Platform and Tools. Explorer sub-navigation stays on explorer pages instead of crowding My hands and player pages.
- Applied the shared treatment across players/profiles, explorer/accounts/address/distribution and detail/replay pages, nodes, tech notes, table management and administration/bridge tools.
- Table creation is an expandable section; the existing table list is reused without repeating lobby headings or duplicate statistics. Removed secondary-page fixed attribution badges that overlapped content.
- TypeScript and production build passed. Six focused suites / 20 tests passed, including five new wallet/navigation tests. Existing build/tooling warnings described above still apply.
- Browser-checked the main secondary pages on desktop; checked My hands, Wallet, More, Players, Nodes, Distribution, Administration, table management (including the expanded form) and Tech notes at 390px width without page-level horizontal overflow. Temporary viewport override was reset.
- No real wallet creation/import/removal, seed-phrase reveal, deposits, withdrawals, table creation or admin transactions were performed. Real multiplayer and transaction flows still require user-controlled testing.

## Approval checklist

### Portrait four-seat board and compact history

- Reproduced community-card/player overlap in a read-only four-seat hand replay with all five board cards and animated winning hole cards.
- Four-seat portrait boards now anchor above the side seats. The bottom edge stays fixed when pot labels appear, avoiding a second pot pushing the cards downward. Card sizes, player positions, other seat counts and landscape layout remain unchanged.
- Mobile history is capped at 300px wide and the smaller of 200px or 28dvh high; the existing close button, outside tap, Escape and scrolling are retained.
- Browser checked 360x640, 390x780 and 430x932 with zero card/seat intersections. Four focused suites / 14 tests and TypeScript pass. No game/wallet actions submitted. Changes are preview-only; the supplied screenshots appear to show the older texashodl.net UI rather than the dev-tunnel build.

### Creation receipts and owner controls (October 11)

- Lobby previously dismissed its creation form without presenting the returned receipt. Lobby and Tables now share a palette-matched receipt dialog with a Join Table link for an identified table, copyable transaction hash, transaction link and keyboard dismissal/focus containment.
- An unavailable table ID is labelled Creation submitted, not confirmed success. The sent hash is retained even if the read client is unavailable, avoiding a misleading failure that could prompt another paid creation.
- Both displayed lists refresh after a creation response. My tables filters against the connected game-wallet address; owners see a Your table label and visible Delete table / Close & refund controls outside the overflow menu. Empty-table, ownership and occupied-tournament restrictions remain intact.
- Confirmation dialogs reset busy/error state when reopened. Failed delete/close calls keep the confirmation open instead of treating a null result as success.
- Verified owner controls and My tables in desktop/390px browser layouts without broadcasting transactions. Ten focused tests cover receipt states, creation hook responses, ownership, confirmation gating and list refresh. Real create/delete lifecycle still requires a user-controlled test; no live-site deployment or upstream push.

### Tables and creation follow-up

- Added a permanent Tables navigation link and public-facing `/tables` route; existing `/admin/tables` and `/table/admin` links still work.
- Renamed the page to Tables, with game discovery as its purpose rather than administration.
- Replaced legacy blue/grey pagination with matching dark surfaces and outlined purple page selection.
- Unified creation-form colours, fields, presets and disabled/action states. The full form separates settings from the balance/fee/total review; the lobby dialog retains its existing inputs and now scrolls within the viewport.
- Verified cash/Sit & Go field switching, pagination to page 2, popup cancellation and 390px layouts. No create or funding actions submitted.
- TypeScript and seven focused suites / 22 tests passed. Fee calculations and submission handlers were not changed.

### Shared table panel follow-up

- Tables now lives under More again; Lobby remains the primary game-discovery destination.
- Chose a shared, explicitly controlled History/Settings panel rather than an auto-dismiss settings popover. Both controls sit inside the desktop banner, switch the same reserved side lane, and toggle closed when clicked again.
- Desktop panels are transparent with a thin outline. Opening a panel reduces the measured stage width so the existing geometry engine fits seats and felt beside it, not behind it. Switching panels keeps that width constant; closing restores full width.
- Compact-mobile drawer styling remains unchanged. No game settings or gameplay actions were changed during browser checks.
- Verified panel switching, transparent backgrounds and non-overlap at 1280px and 900px, plus More navigation. TypeScript and six focused suites / 24 tests (including geometry resize and panel-state tests) passed.

1. Review the new lobby and table in the running local preview.

Latest table UX adjustment: desktop history is now the default persistent view
(closing Settings returns to it). Removed the reserved side lane completely:
history/settings never change stage width or table geometry. History uses compact
text, transparent surfaces and a bounded scrolling body; its available height is
limited by the existing table bounds when side space is narrow. It follows new
actions unless the reader scrolls upward. Full screen is now a local table-only
view, not the browser Fullscreen API: banners hide, the action controls remain
mounted, and Show controls or Escape restores banners. Verified at 1280px and
900px without game or wallet submissions.
2. Run a coordinated, user-controlled multiplayer hand test, including turn timers, fold/call/raise, showdown, reconnect and tournament states. This has not yet been performed.
3. Resolve the runtime/tooling mismatch and restore the broader test suite before a release candidate.
4. Add visual regression coverage and obtain team approval before any deployment or upstream PR.

## Mobile action / seat clearance (October 11, local preview)

- Replaced the fixed mobile action overlay with a normal-flow `MobileActionDock`, below the measured table stage. It reserves 160px in portrait / 96px in landscape initially, measures the full controls including safe-area padding, and retains the largest observed height until the viewport changes. Idle/active transitions keep the table stable; action hooks remain mounted.
- Mobile geometry no longer subtracts the obsolete 90px/80px footer estimate. Landscape seat bounds include the full scaled cards/badge/timer height, and very short mobile screens may scale below 0.3 instead of forcing seats into the controls. Desktop footer behavior is unchanged.
- Added a dev-only offline fixture at `/src/dev/mobile-actions.html`, using real layout and presentational betting controls with inert handlers. It does not mount game/wallet providers or automatic action hooks, and is not a production build entry.
- Browser fixture checks: 390×780 and 360×640 portrait; 844×390 and 667×320 landscape. All 2/4/6/9 seat layouts remain clear of controls; turning controls off preserves stage height. Unit geometry also covers coarse-pointer 966×1100 and 1280×740 tablet/foldable screens. No live gameplay was tested or submitted.
- TypeScript, production build, and four focused suites / 37 tests pass. Rebuilt the shared preview files used by port 4173; refresh the team link. No deployment or upstream push.

## Modal consistency pass (October 11, local preview)

- Added `ModalTheme.css`: an explicitly scoped, table-appearance-independent dark-purple dialog theme, muted lilac labels, outlined secondary actions, orange/pink primary actions, visible keyboard focus, and viewport-bounded scrolling. Existing success/danger warnings retain their meaning. Legacy utility aliases are scoped to `.hodl-modal`, not the rest of the site or third-party wallet UI.
- Covered the shared Modal consumers (top-up, leave/delete/refund confirmations, deal entropy, advanced/upcoming SNG, avatar) and standalone buy-in, tournament entry/waiting/results/countdown, deposit/withdrawal/signature, wallet-required/import/backup/send/access and diagnostic pop-ups. Existing table creation/receipt dialogs already use the new creation theme.
- Replaced the oversized tournament logo/decorative blue panels with a compact Texas HODL heading. Entry facts use a two-column grid and fee details remain present on short landscape screens. Financial calculations, transaction handlers and non-dismissible tournament state rules remain unchanged.
- Shared dismissible dialogs now have a visible close control, disabled while processing. Deposit also has a top-right close button; its existing dismiss behavior is preserved. Cash buy-in actions stack on phones.
- Read-only browser review: tournament entry at 390×780 (366px wide, fully visible) and 844×390 (scrollable, all fees retained); mobile deposit, withdrawal, send and avatar. Confirmed rebuilt port 4173 renders the new entry modal. The crypto payment service returned a connection error during review; no payment or other live transaction was attempted.
- TypeScript and production build pass. Seven focused suites / 37 tests pass, including new shared-modal and tournament-entry regressions. Existing Vite environment/dependency/chunk-size warnings remain. No live-site deployment or upstream push.

## Dollar display precision (local only)

### History responsiveness follow-up (October 11)

- Replaces the old tall mobile sidebar with an explicitly opened reader, at most 280px / 36% viewport height. A visible History launcher, close button, outside tap and Escape make dismissal straightforward. Moving between desktop and mobile clears the panel selection.
- Desktop keeps a transparent 240px live feed with readable 12px actions and tighter seat metadata. Copy/export/share are tucked into the expanded reader. Where available space is too short for rows, a latest-action summary replaces the cramped scrolling sliver; Expand or the banner History control opens the full reader.
- Neither dock nor expanded reader changes table geometry. The reader follows new actions unless the user scrolls up. Escape dismisses the reader before leaving table-only view.
- Verified desktop and portrait locally without transactions; four focused suites / 12 tests, TypeScript and production build pass. Rebuilt the preview files used by port 4173. No upstream push or live-site deployment.
- Tunnel access remains unchanged. VS Code Ports > right-click 4173 > Port Visibility > Public removes visitor sign-in, but makes the preview publicly accessible. Switch back to Private or stop forwarding after review. The preview still connects to the shared game network.

Table spacing follow-up: history now uses a 180px transparent dock with tighter action/seat columns and seat-aware height limits. Desktop/tablet geometry has a fixed 48px left bias (clamped to available space), independent of panel state and without changing scale. Settings uses content-driven height, shorter descriptions and a two-column layout in short wide windows; all five switches remain present with no inner scrolling. The Texas HODL felt logo is centred and enlarged to 44% of felt width, below the card/pot layer. Browser verified at 1280×720, 900×800 and 900×550; TypeScript, production build and 28 focused layout/settings tests pass. No gameplay, transactions or deployments performed.

- Dollar/USDC labels now use two decimal places, rounding upward to the next cent: 0.200000 → 0.20, 0.200001 → 0.21, and 0.333333 → 0.34. Exact cents and zero remain unchanged.
- `moneyDisplay.ts` keeps micro-unit strings/bigints exact, supports grouped large amounts, and uses mathematical ceiling for signed net results. Invalid data displays a dash rather than a false zero balance.
- Applied to lobby/table amounts, creation fees, wallet/payment labels, player statistics, history and explorer/support pages. Tournament chips, percentages, ETH values and raw diagnostic micro-units retain their own formatting.
- Display rounding must never be parsed into transactions. Existing editable buy-in/Max/slider formatting and conversion helpers remain separate; underlying fee, affordability, payout and transaction calculations are unchanged. Rounded component fees may differ by a cent from their independently rounded total.
- Browser checked the cash creation fee ($0.20), zero balance ($0.00), and fractional SNG creation fee ($0.34), without creating a table or submitting a wallet/game action.
- TypeScript, production build, and 10 focused suites / 245 tests pass. A top-up regression verifies that an upward-rounded balance label does not increase the submitted amount. Three broader suites (ActionsLog, useWinnerInfo, usePlayerActionDropBox) remain blocked by the existing Jest/import.meta.env setup. Existing Vite environment/dependency/bundle-size warnings remain.

## Consistent modal headers (October 12)

- Added a shared `ModalHeader`: Texas HODL logo at the upper right, left-aligned title and subtitle, and an in-flow close control when dismissal was already available.
- Applied to shared dialogs plus standalone cash-seat/SNG buy-in, wallet, creation/receipt, tournament waiting/countdown/results, deposit/withdrawal, signature and diagnostic dialogs. Third-party wallet/payment dialogs are outside this app-owned styling.
- Preserved transaction handlers, disabled states, fees and existing dismissal restrictions. No live wallet/game actions used for verification.
- Header/entry/result/confirmation/avatar regression coverage: 8 suites, 39 tests. Offline `src/dev/modal-headers.html` exercises the shared header at narrow viewport sizes without loading wallet data.
