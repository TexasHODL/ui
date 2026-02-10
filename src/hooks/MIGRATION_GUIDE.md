# Hook Organization Migration Guide

This guide helps developers transition to the new organized hook structure.

## ✅ What's Been Done

### 1. Comprehensive Documentation (`README.md`)
- All 57 hooks documented with:
  - Purpose and use cases
  - Parameter descriptions
  - Return value documentation
  - Code examples
  - Data flow patterns
  - Update mechanisms (WebSocket vs polling)

### 2. Category Structure Created
```
hooks/
├── game/          # 20 hooks - Game state and table management
├── player/        # 8 hooks - Player data and state
├── playerActions/ # 14 hooks - Player actions (already organized)
├── wallet/        # 8 hooks - Wallet and deposits
├── animations/    # 3 hooks - UI animations
├── notifications/ # 2 hooks - Notifications
└── README.md      # Comprehensive documentation
```

### 3. Category Index Files
Each category has an `index.ts` that re-exports hooks:

```typescript
// hooks/game/index.ts
export { useTableData } from '../useTableData';
export { useTableState } from '../useTableState';
// ... etc
```

## 🎯 Current Import Patterns

### Option 1: Existing Imports (Still Works)
```typescript
// Direct imports - no changes needed
import { useTableData } from '../hooks/useTableData';
import { usePlayerData } from '../hooks/usePlayerData';
```

### Option 2: Category Imports (New, Recommended)
```typescript
// Import from category - cleaner and more organized
import { useTableData, useTableState } from '../hooks/game';
import { usePlayerData, usePlayerChipData } from '../hooks/player';
import { useCosmosWallet } from '../hooks/wallet';
```

### Option 3: Namespace Imports
```typescript
// Import entire category as namespace
import * as GameHooks from '../hooks/game';
import * as PlayerHooks from '../hooks/player';

const tableData = GameHooks.useTableData();
const playerData = PlayerHooks.usePlayerData(seatIndex);
```

## 🚀 Future Migration (Optional)

### Phase 1: Physical File Organization
Move files from `hooks/` root to appropriate subdirectories:

```bash
# Example: Move game hooks
mv hooks/useTableData.ts hooks/game/
mv hooks/useTableState.ts hooks/game/
mv hooks/useCosmosGameState.ts hooks/game/
# ... etc
```

Update index.ts files:
```typescript
// hooks/game/index.ts - AFTER moving files
export { useTableData } from './useTableData';  // Note: ./ instead of ../
export { useTableState } from './useTableState';
```

### Phase 2: Update All Imports
Use find-and-replace or codemod to update imports throughout codebase:

```bash
# Find all files importing hooks
grep -r "from.*hooks/use" src/

# Example replacements
# OLD: import { useTableData } from '../hooks/useTableData';
# NEW: import { useTableData } from '../hooks/game';
```

### Phase 3: Cleanup
Remove empty hooks/ root directory files after verification.

## 📊 Migration Impact

### Current State (Zero Breaking Changes)
- ✅ All existing imports still work
- ✅ No code changes required
- ✅ Category imports available as opt-in
- ✅ Full backward compatibility

### After Full Migration (Breaking Changes)
- ⚠️ All imports must use category structure
- ⚠️ Direct hook imports will break
- ⚠️ Requires updating ~1000+ import statements

## 🎓 Development Guidelines

### When Creating New Hooks

1. **Choose the right category**:
   - Game state/table → `hooks/game/`
   - Player-specific → `hooks/player/`
   - Player actions → `hooks/playerActions/`
   - Wallet/deposits → `hooks/wallet/`
   - Animations → `hooks/animations/`
   - Notifications → `hooks/notifications/`

2. **Add JSDoc documentation**:
```typescript
/**
 * Brief description of what the hook does
 *
 * Longer explanation including:
 * - Data sources (WebSocket, API, blockchain)
 * - Update patterns (real-time, polling, manual)
 * - Use cases and when to use this hook
 *
 * @param paramName - Parameter description
 * @returns Object with hook values and methods
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useMyHook(param);
 * ```
 */
export const useMyHook = (param: Type): ReturnType => {
  // implementation
};
```

3. **Export from category index**:
```typescript
// hooks/game/index.ts
export { useMyHook } from './useMyHook';  // or '../useMyHook' if not migrated
```

4. **Update README.md**:
   - Add hook to appropriate category section
   - Include usage example
   - Document parameters and return values

## 📖 Finding Hooks

### By Use Case
1. Need table/game data? → Check `hooks/game/` section in README
2. Need player info? → Check `hooks/player/` section
3. Need to perform action? → Check `hooks/playerActions/` section
4. Need wallet functionality? → Check `hooks/wallet/` section

### By Search
```bash
# Search hook documentation
grep -i "keyword" hooks/README.md

# Find hook file
find hooks/ -name "*keyword*.ts"

# Search hook implementations
grep -r "export.*use.*keyword" hooks/
```

## 🔍 Hook Quick Reference

### Most Commonly Used

**Game State:**
- `useTableData()` - Core table data (players, pots, cards)
- `useGameProgress()` - Game flow and active players
- `useTableState()` - Current table state

**Player Data:**
- `usePlayerData(seat)` - Player info for specific seat
- `usePlayerTimer()` - Action countdown timer
- `useAllInEquity()` - Win probability display

**Player Actions:**
- `usePlayerLegalActions()` - Valid actions for current player
- `betHand()`, `raiseHand()`, `callHand()`, `foldHand()` - Action execution

**Wallet:**
- `useCosmosWallet()` - Main wallet interface
- `useDepositUSDC()` - Bridge deposits
- `useWithdraw()` - Bridge withdrawals

See [README.md](./README.md) for complete list.

## 💡 Tips

### Performance
- Most hooks use `useMemo()` and `useCallback()` internally
- Hooks reading from GameStateContext are real-time via WebSocket
- No need to manually refetch unless explicitly provided

### Debugging
- Check console logs for hook-specific debug output
- Look for `🔍`, `💰`, `🎰`, `🎲` emoji prefixes in logs
- Use React DevTools to inspect hook state

### Testing
- See `useTurnNotification.test.ts` for testing patterns
- Use `@testing-library/react-hooks` for hook testing
- Mock GameStateContext for isolated tests

## 🤝 Contributing

When updating hook organization:

1. Update hook file (if needed)
2. Update category index.ts
3. Update README.md
4. Add/update tests
5. Document in PR what changed

## 📅 Timeline

- **Phase 0 (Current)**: Documentation and category structure ✅
- **Phase 1 (Future)**: Physical file migration ⏸️
- **Phase 2 (Future)**: Import updates across codebase ⏸️
- **Phase 3 (Future)**: Cleanup and deprecation ⏸️

Phases 1-3 are deferred to avoid disrupting active development.

---

Last Updated: 2026-01-28
Related Issue: #1672
