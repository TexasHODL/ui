# Styling Inline Audit (Components + Full UI)

Date: 2026-02-23
Scope: `ui/src/**/*.tsx` and `ui/src/**/*.css`

## Objective

Establish and enforce consistent styling standards across the frontend using:

- CSS Modules for component styling
- Tailwind for layout/utilities
- CSS variables for theme/design tokens
- Runtime-only inline styles as exceptions

## Current-state verification

### Inline styles (full UI)

- Total `style={...}` usages: **515**
- Object-literal inline styles `style={{...}}`: **405**
- TSX files with inline styles: **60**

### Inline styles (components only)

- Total `style={...}` usages: **339**
- Object-literal inline styles `style={{...}}`: **278**
- TSX files with inline styles: **51**

### Stylesheet footprint (full UI)

- Total stylesheet files (`*.css` + `*.module.css`): **11**
- CSS Modules currently in use: **0**

#### CSS hotspot summary

- `src/components/playPage/Table.css`: 476 LOC, high legacy footprint
- `src/components/Footer.css`: 219 LOC, heavy `rgba`/variable usage
- `src/components/playPage/common/Badge.css`: 214 LOC, hardcoded color usage
- `src/components/QRDeposit.css`: 94 LOC, hardcoded color usage
- `src/pages/Dashboard.css`: 59 LOC, hardcoded color usage

## Ticket issues verification

1. **Mixed styling approaches** — Verified (global CSS + Tailwind + inline styles).
2. **Inline styles scattered throughout** — Verified (515 total instances).
3. **Duplicate gradient definitions** — Verified (TSX literals + CSS + utility-generated values).
4. **No single enforced design system** — Verified (theme source exists but enforcement is inconsistent).

## Policy decision (for migration)

- Remove **all static inline styles** from components.
- Keep **runtime-only inline styles** when values are inherently dynamic at render time.
- Runtime exceptions must be minimal and colocated with the element that requires them.

### Allowed runtime inline style examples

- Position/size from live state (`left`, `top`, `width`, `height`)
- Progress values (`width` percentages)
- Per-instance animation delay or transform derived from runtime state

### Disallowed inline style examples (migrate to CSS Modules)

- Static `backgroundColor`, `color`, `border`, `boxShadow`, gradients
- Static visual variants that can be class-driven

## Recommended architecture (confirmed)

- **Primary method**: CSS Modules
- **Utilities**: Tailwind classes for layout/spacing/responsive primitives
- **Theming**: CSS custom properties from `src/utils/colorConfig.ts` injected in `src/App.tsx`
- **Inline styles**: Runtime-only exceptions

This architecture preserves current functionality while reducing style drift and maintenance cost.

## Design tokens

### Existing token source

- `src/utils/colorConfig.ts` (`generateCSSVariables`, color map helpers)

### Migration token set

- **Color**: `--surface-*`, `--text-*`, `--border-*`, `--status-*`
- **Gradient**: `--gradient-primary`, `--gradient-success`, `--gradient-danger`
- **Spacing**: `--space-1..8` aligned to 4px/8px scale
- **Typography**: `--font-size-*`, `--line-height-*`, `--font-weight-*`
- **Breakpoints**: mobile/tablet/desktop/large semantics documented and reused consistently

## Implementation guidelines

- BEM-style naming for CSS classes where useful (`block__element--modifier`)
- `styles.camelCase` imports for CSS Modules
- Kebab-case CSS variables (`--color-primary`)
- No new hardcoded colors in touched files
- Prefer low specificity; avoid `!important`
- Mobile-first responsive behavior

## Full UI prioritized hotspots

1. `src/pages/TestSigningPage.tsx` — 62
2. `src/components/CosmosWalletPage.tsx` — 31
3. `src/components/QRDeposit.tsx` — 29
4. `src/pages/explorer/TransactionPage.tsx` — 29
5. `src/pages/Dashboard.tsx` — 24
6. `src/components/depositComponents/Web3DepositSection.tsx` — 20
7. `src/components/modals/WithdrawalModal.tsx` — 20
8. `src/components/playPage/Table/components/TableHeader.tsx` — 20
9. `src/pages/explorer/BlockDetailPage.tsx` — 20
10. `src/components/modals/BuyInModal.tsx` — 19

## Migration plan (stepwise)

### Wave 1: Modal stack (highest payoff)

Targets:

- `src/components/modals/BuyInModal.tsx`
- `src/components/modals/DepositCore.tsx`
- `src/components/modals/TopUpModal.tsx`
- `src/components/modals/WithdrawalModal.tsx`

Actions:

1. Add colocated `*.module.css` files
2. Move static inline styles into module classes
3. Keep runtime-only values inline
4. Normalize modal gradients via shared CSS variables/classes

### Wave 1 implementation status (completed)

Completed files:

- `src/components/modals/BuyInModal.tsx` + `src/components/modals/BuyInModal.module.css`
- `src/components/modals/DepositCore.tsx` + `src/components/modals/DepositCore.module.css`
- `src/components/modals/TopUpModal.tsx` + `src/components/modals/TopUpModal.module.css`
- `src/components/modals/WithdrawalModal.tsx` + `src/components/modals/WithdrawalModal.module.css`

Wave 1 outcomes:

- Static inline styles removed from all four Wave 1 modal files.
- Colocated CSS Modules added for each migrated modal.
- `useModalStyles` usage removed from migrated files where static styles were replaced.
- Runtime behavior preserved (validation, loading states, disabled states, async actions).

Evidence check:

- `style={` usage across Wave 1 target files: **0 matches**.

Post-Wave-1 snapshot (full UI):

- Total `style={...}` usages: **460** (from 515)
- Object-literal inline styles `style={{...}}`: **365** (from 405)
- TSX files with inline styles: **56** (from 60)
- Stylesheet files (`*.css` + `*.module.css`): **15** (from 11)
- CSS Modules in use: **4** (from 0)

Notable changes:

- Added `--accent-warning` in `src/utils/colorConfig.ts` for warning-state modal styles.
- No additional new token variables were required for Wave 1.

### Wave 2: Wallet/deposit surfaces

Targets:

- `src/components/CosmosWalletPage.tsx`
- `src/components/QRDeposit.tsx`
- `src/components/depositComponents/*`

### Wave 2 kickoff (next execution block)

Start order:

1. `src/components/CosmosWalletPage.tsx`
2. `src/components/QRDeposit.tsx`
3. `src/components/depositComponents/Web3DepositSection.tsx`
4. Remaining `src/components/depositComponents/*`

Wave 2 done criteria:

- Static inline styles in touched files are migrated to colocated CSS Modules.
- Existing CSS variables are used for theme-able color/surface values.
- Any new token variable is added only when required and documented in this audit.
- Runtime-only inline styles remain as explicit exceptions.
- No regressions in deposit/wallet interactions and responsive layouts.

Wave 2 notable watchouts:

- Preserve wallet connection state and async loading/error visuals.
- Keep payment/deposit action button disabled/loading behavior unchanged.
- Consolidate repeated panel/card/button styling across wallet/deposit surfaces.

### Wave 2 implementation status (completed)

Completed files:

- `src/components/CosmosWalletPage.tsx` + `src/components/CosmosWalletPage.module.css`
- `src/components/QRDeposit.tsx` + `src/components/QRDeposit.module.css`
- `src/components/depositComponents/BalanceDisplay.tsx`
- `src/components/depositComponents/DepositProgressBar.tsx`
- `src/components/depositComponents/DepositTimer.tsx`
- `src/components/depositComponents/QRCodeDisplay.tsx`
- `src/components/depositComponents/SessionStatusCard.tsx`
- `src/components/depositComponents/Web3DepositSection.tsx`
- `src/components/depositComponents/DepositComponents.module.css`

Wave 2 outcomes:

- Static inline styles removed from `CosmosWalletPage` and `QRDeposit`.
- Static inline styles removed from all `depositComponents/*` files.
- Shared wallet/deposit style primitives centralized in `DepositComponents.module.css`.
- Runtime-only inline style retained where required (`DepositProgressBar` progress width).

Evidence check:

- `style={` usage in `src/components/QRDeposit.tsx`: **0 matches**.
- `style={` usage in `src/components/depositComponents/*`: **1 match** (runtime progress width).

Post-Wave-2 snapshot (full UI):

- Total `style={...}` usages: **356** (from 460 post-Wave-1; from 515 baseline)
- Object-literal inline styles `style={{...}}`: **267** (from 365 post-Wave-1; from 405 baseline)
- TSX files with inline styles: **49** (from 56 post-Wave-1; from 60 baseline)
- Stylesheet files (`*.css` + `*.module.css`): **18** (from 15 post-Wave-1; from 11 baseline)
- CSS Modules in use: **7** (from 4 post-Wave-1; from 0 baseline)

### Wave 2 visual parity verification (completed)

Verification date: 2026-02-23

Scope checked:

- `src/components/CosmosWalletPage.tsx` + `src/components/CosmosWalletPage.module.css`
- `src/components/QRDeposit.tsx` + `src/components/QRDeposit.module.css`
- `src/components/depositComponents/*` + `src/components/depositComponents/DepositComponents.module.css`

What was verified:

- Removing `colorConfig` direct imports in migrated components does **not** remove theming, because `generateCSSVariables()` is still injected from `src/App.tsx` at runtime.
- Migrated class styles still consume the same token source (`--brand-*`, `--ui-*`, `--accent-*`) from `src/utils/colorConfig.ts`.
- Interactive states (disabled/hover/loading) remain implemented and equivalent, with CSS pseudo-classes replacing JS `onMouseEnter/onMouseLeave` style mutation.
- Runtime-only inline style exception remains only where required (`DepositProgressBar` progress width).

Parity outcome:

- No functional behavior changes observed from import removal.
- Expected visual differences are limited to minor rendering variance from CSS `color-mix(...)` vs prior JS `hexToRgba(...)` composition.
- No additional token changes were required for this verification pass.

### Wave 3: Play surfaces

Targets:

- `src/components/playPage/Table/components/TableHeader.tsx`
- `src/components/playPage/Players/*`
- `src/components/playPage/common/Badge.tsx`
- `src/components/common/Modal.tsx`

### Wave 4: Explorer/admin pages

Targets:

- Inline-style-heavy pages in `src/pages/explorer/*` and `src/pages/admin/*`

### Wave 5: Legacy global CSS consolidation

Targets:

- `src/components/playPage/Table.css`
- `src/components/Footer.css`
- `src/components/playPage/common/Badge.css`

## Acceptance criteria (refined)

1. Single architecture documented and followed: CSS Modules + Tailwind + CSS variables.
2. Static visual styles in touched files are migrated out of inline styles.
3. Runtime-only inline styles are the only exceptions.
4. New/updated colors in touched files use CSS variables.
5. Theme switching remains correct after each migration wave.
6. Styling standards are documented in repository docs.

## PR enforcement checklist

- [x] No new static `style={{...}}` blocks added (Wave 1 touched files)
- [x] Static inline styles in touched files are migrated (Wave 1)
- [x] Runtime inline styles are justified by live-state requirements (Wave 1)
- [x] New/updated colors use CSS variables (Wave 1)
- [x] Responsive behavior and functionality are preserved (Wave 1)