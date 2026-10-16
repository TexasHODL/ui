import { createContext, useContext } from "react";

/**
 * Pinned action badge for one seat. The table preview fills this so every
 * seat can show the real badge at once. Live tables leave the context null.
 */
export interface PinnedSeatAction {
    action: string;
    amount: string;
    isVisible: boolean;
    isTextHiding: boolean;
    isAnimatingOut: boolean;
}

export const PreviewSeatActionsContext = createContext<readonly PinnedSeatAction[] | null>(null);

/** The preview label for this seat, or null when the preview toggle is off. */
export const usePreviewSeatAction = (seat: number): PinnedSeatAction | null => {
    const actions = useContext(PreviewSeatActionsContext);
    if (!actions) return null;
    return actions[seat - 1] ?? null;
};
