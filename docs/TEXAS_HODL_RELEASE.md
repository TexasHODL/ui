# Texas HODL UI releases

The public Texas HODL frontend lives in this repository (`TexasHODL/ui`) and is served at [play.texashodl.net](https://play.texashodl.net/).

Changes are not published from this repo to `block52/ui`. Merging into `main` is a production release.

## How it ships

- The production branch is `main`. DigitalOcean App Platform auto-deploys `main` to [play.texashodl.net](https://play.texashodl.net/).
- Feature work is done on a branch (typically `cursor/...`) and opened as a pull request by the **TexasHODL** GitHub account (`TexasHODL <admin@texashodl.net>`).
- Andrew reviews and merges when the change is ready to go live. Do not merge or push to `main` unless that release is approved.
- After a merge, confirm the DigitalOcean deploy finished and spot-check the live site (lobby, a table, and any feature the PR touched).

## Upstream syncs

`TexasHODL/ui` is a fork of [`block52/ui`](https://github.com/block52/ui). Bringing upstream changes in is a normal pull request, not a direct push to `main`:

1. Merge `block52/ui` `main` into a working branch with a **merge commit** (do not squash the upstream history, and do not rebase already-pushed fork history).
2. Resolve conflicts, run the usual checks, and open the PR as **TexasHODL**.
3. Merge to `main` only after review, the same as any other release.

## Before merging to `main`

1. Review the PR. When GitHub Actions is enabled on this repository, wait for its checks to finish. Actions may need to be re-enabled under the TexasHODL account if they have been disabled.
2. Confirm the DigitalOcean app is still pointed at `TexasHODL/ui` and deploys from `main`.
3. Merge only when you are ready for DigitalOcean to deploy.
4. After the deploy, check the lobby, watch mode, mobile controls, and any other area the PR changed.

No private environment files, generated builds, or wallet keys belong in the PR. Display rounding stays separate from exact transaction amounts.

## Related docs

- [`TEXAS_HODL_LOCAL_REDESIGN.md`](TEXAS_HODL_LOCAL_REDESIGN.md) — branding, networks, and running a local copy.
- [`archive/TEXAS_HODL_LOCAL_REDESIGN-2026-10.md`](archive/TEXAS_HODL_LOCAL_REDESIGN-2026-10.md) — historical October 2026 redesign work log (no longer the current release or development guide).
