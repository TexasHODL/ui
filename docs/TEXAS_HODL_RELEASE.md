# Texas HODL UI release candidate

Target: `TexasHODL/ui`, branch `codex/texashodl-ui-redesign`, PR into `main`.
No changes are being published to `block52/ui`. Merging into the production branch
is a separate approval step because DigitalOcean auto-deploys that branch.

## Included

- Texas HODL lobby, wallet and supporting page redesign, shared modal headers and branding.
- Mobile table/action clearance, landscape betting presets, compact history and table-only view.
- Seated-table indicators, spectator entry, table ID sharing and availability-aware close/refund controls.
- Fanned hole cards and immediate tournament finishing-hand recaps using the table card artwork.
- Read-only payout-claim checks, collected-state navigation and winning-card highlights.
- Latest TexasHODL main fixes retained, including bridge recovery, replay timers and debug-overlay shortcuts.
- Scheduled upstream fork syncing changed to manual-only; review upstream changes before syncing.

Only revealed finishing-hand cards are retained. Missing snapshots are labelled,
not reconstructed from hidden cards. Display rounding remains separate from exact
transaction amounts. No private environment files, generated builds or wallet keys
are included.

## Validation (October 12, 2026)

- TypeScript and production build passed.
- Jest with coverage: 156 suites, 1,927 tests passed; configured coverage thresholds passed.
- ESLint could not start: the installed TypeScript/ESLint parser combination throws
  `Cannot read properties of undefined (reading 'Cjs')`. Dependency remediation
  remains separate from this UI release.
- Build warns about unset VITE_APP metadata variables in the clean checkout, a
  browser-externalized dependency, dependency eval and bundle size. Preserve and
  verify the existing DigitalOcean production environment before merging.
- No real-money collection, deposit, withdrawal or game actions were submitted
  during release preparation. Existing local UI checks are recorded in
  `TEXAS_HODL_LOCAL_REDESIGN.md`; a fresh multiplayer smoke test is still recommended.

## Before going live

1. Review the PR and its GitHub checks in TexasHODL/ui.
2. Verify the DigitalOcean app still uses TexasHODL/ui and its intended production branch/environment.
3. Approve and merge only when ready for DigitalOcean to deploy.
4. Check lobby, watch mode, mobile controls and tournament results on the deployed site.
