# Modals

This directory contains all modal components used throughout the poker application. The modals are centralized here for better organization and reusability.

## Available Modals

### Game-Related Modals

- **BuyInModal** - Modal for players to buy into a poker table
  - Allows selection of buy-in amount
  - Shows available balance
  - Used when joining a new table

- **LeaveTableModal** - Confirmation modal for leaving a table
  - Displays current stack
  - Warning for active hands
  - Confirms player intention to leave

- **TopUpModal** - Modal for topping up chips at the table
  - Allows players to add more chips while seated
  - Shows current stack and maximum buy-in
  - Only available when not in an active hand

- **DealEntropyModal** - Modal for adding entropy to card dealing
  - System entropy generation
  - Optional user password for additional entropy
  - Used to ensure fair card distribution

- **SitAndGoAutoJoinModal** - Auto-join modal for Sit & Go tournaments
  - Displays tournament details
  - Shows available seats
  - Automatic seat assignment

### Wallet-Related Modals

- **USDCDepositModal** - Modal for depositing USDC from Base Chain
  - Bridge from Base Chain to game wallet
  - MetaMask integration
  - Network switching support

- **WithdrawalModal** - Modal for withdrawing funds
  - Withdraw from game wallet to MetaMask
  - Displays available balance
  - Requires MetaMask connection

## Usage

All modals can be imported from this directory using the centralized index file:

```typescript
// From a page component (e.g., /pages/Dashboard.tsx)
import { USDCDepositModal, WithdrawalModal } from "../components/modals";

// From a playPage component (e.g., /components/playPage/Table.tsx)
import { BuyInModal, LeaveTableModal } from "../modals";

// From another component in /components (e.g., /components/BuyChipsButton.tsx)
import { TopUpModal } from "./modals";

// Import multiple modals at once
import { 
  BuyInModal, 
  LeaveTableModal, 
  TopUpModal 
} from "../components/modals"; // Adjust path based on your file location
```

**Note**: The import path depends on where your importing file is located in the directory structure. Adjust the relative path (`../`, `./`) accordingly.

## Common Props

Most modals follow a similar pattern with these common props:

- `isOpen?: boolean` - Controls modal visibility (some use manual mounting)
- `onClose: () => void` - Callback to close the modal
- `onSuccess?: () => void` - Optional callback on successful action
- `tableId?: string` - The ID of the current table (if applicable)

## Styling

All modals use:
- Consistent color scheme from `utils/colorConfig`
- Backdrop blur effect
- Hexagon pattern background (for game-related modals)
- Responsive design with Tailwind CSS

## Notes

- Modals are mounted/unmounted rather than shown/hidden for performance
- Some modals use `createPortal` for rendering in specific DOM locations
- All modals handle loading and error states internally
