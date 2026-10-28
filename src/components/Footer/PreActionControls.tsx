import React from "react";
import { PreAction } from "../../utils/preActions";

interface PreActionControlsProps {
    /** The buttons to show, left→right (from preActionButtons). */
    buttons: PreAction[];
    /** Which pre-action is armed, or null. */
    armed: PreAction | null;
    /** Arm a pre-action, or null to disarm. Arming is mutually exclusive. */
    onArm: (action: PreAction | null) => void;
    /** Formatted owed amount, e.g. "$3" — shown on the "Call {amount}" button. */
    callAmountLabel: string;
    isMobileLandscape?: boolean;
    /** Phone dock: smaller controls that stay inside the reserved action slot. */
    compact?: boolean;
    /** Mobile landscape: put each pre-action on the action-column slot it turns into. */
    landscapeSlots?: boolean;
    leftHand?: boolean;
}

const LABELS: Record<PreAction, string> = {
    "check-fold": "Check/Fold",
    check: "Check",
    fold: "Fold",
    "call-exact": "Call", // suffixed with the amount at render time
    "call-any": "Call Any",
    "all-in": "All In"
};

/** Same faces as the betting buttons, so the row reads on the dark action bar. */
const BUTTON_CLASS: Record<PreAction, string> = {
    "check-fold": "btn-fold",
    check: "btn-check",
    fold: "btn-fold",
    "call-exact": "btn-call",
    "call-any": "btn-call",
    "all-in": "btn-call"
};

const TITLES: Record<PreAction, string> = {
    "check-fold": "Checks when your turn comes if checking is free; folds if someone bets first.",
    check: "Checks when your turn comes. Clears if someone bets first.",
    fold: "Folds your hand when your turn comes.",
    "call-exact": "Calls this exact amount when your turn comes. Clears if the bet is raised.",
    "call-any": "Calls whatever the bet is when your turn comes.",
    "all-in": "Calls all-in when your turn comes (the call commits your whole stack)."
};

/**
 * CoinPoker-style pre-action bar (ui#388): tick-to-arm buttons shown while it is not
 * the player's turn. `buttons` (from preActionButtons) already encodes which options
 * apply — can check, owe a bet, owe an all-in call, or waiting on a raise (Check/Fold).
 * Arming one fires it the instant the player's turn comes (no betting bar).
 */
export const PreActionControls: React.FC<PreActionControlsProps> = ({
    buttons,
    armed,
    onArm,
    callAmountLabel,
    isMobileLandscape,
    compact = false,
    landscapeSlots = false,
    leftHand = false
}) => {
    if (buttons.length === 0) return null;

    // Check/Fold stays armed after a bet replaces it with Fold. The Fold box shows that choice.
    const shownArmed = armed === "check-fold" && !buttons.includes("check-fold") && buttons.includes("fold") ? "fold" : armed;

    const renderButton = (action: PreAction) => {
        const isArmed = shownArmed === action;
        const label = action === "call-exact" ? `Call ${callAmountLabel}` : LABELS[action];
        return (
            <button
                key={action}
                type="button"
                role="checkbox"
                aria-checked={isArmed}
                aria-label={`Pre-select ${label} for your turn`}
                title={TITLES[action]}
                data-action={action}
                onClick={() => onArm(isArmed ? null : action)}
                className={`${BUTTON_CLASS[action]} flex items-center gap-2 rounded-lg border font-semibold ${
                    isArmed ? "pre-action-on" : ""
                } ${compact ? "" : isMobileLandscape ? "px-3 py-1 text-xs" : "px-4 py-3 text-sm lg:text-base"}`}
            >
                <span
                    className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] leading-none ${
                        isArmed ? "bg-white border-white text-green-600" : "border-gray-400 text-transparent"
                    }`}
                >
                    ✓
                </span>
                <span>{label}</span>
            </button>
        );
    };

    if (landscapeSlots) {
        // Same container, stack and button classes as MobileBettingCluster, one button
        // per slot as direct children, so every pre-action has exactly the size and
        // position of the action it turns into. Stack is column-reverse: DOM order is
        // bottom-up FOLD, CHECK, CALL, RAISE; empty slots are spacers of slot height.
        const rows = landscapePreActionSlots(buttons);
        return (
            <div className={`pre-action-bar pre-action-slots mobile-bet mobile-bet-landscape${leftHand ? " hand-left" : ""}`} data-testid="pre-action-bar">
                <div className="mobile-actions-stack">
                    {rows.map((action, i) =>
                        action ? renderButton(action) : <div key={`empty-${SLOT_NAMES[i]}`} className="mobile-slot" data-slot={SLOT_NAMES[i]} aria-hidden="true" />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`pre-action-bar flex justify-center ${compact ? "pre-action-compact" : "gap-2"}`} data-testid="pre-action-bar">
            {buttons.map(renderButton)}
        </div>
    );
};

const SLOT_NAMES = ["fold", "check", "call", "raise"] as const;

/**
 * Mobile-landscape slot mapping, bottom-up to match the action column:
 * index 0 FOLD, 1 CHECK, 2 CALL, 3 RAISE (always empty). null = empty slot.
 *  - owing a bet: Fold on FOLD, Call Any on CHECK (free, checking is impossible), Call $x on CALL
 *  - all-in call: Fold on FOLD, All In on CALL
 *  - free check: Check on FOLD (folding is never needed), Check/Fold on CHECK, Call Any on CALL
 *  - lone Check/Fold: on CHECK
 */
export function landscapePreActionSlots(buttons: PreAction[]): (PreAction | null)[] {
    const has = (a: PreAction) => buttons.includes(a);
    const slots: (PreAction | null)[] = [null, null, null, null];
    if (has("fold")) slots[0] = "fold";
    if (has("check-fold")) {
        slots[1] = "check-fold";
        if (has("check")) slots[0] = "check";
    } else if (has("check")) {
        slots[1] = "check";
    }
    if (has("call-exact")) {
        slots[2] = "call-exact";
        if (has("call-any")) slots[1] = "call-any";
    } else if (has("all-in")) {
        slots[2] = "all-in";
    } else if (has("call-any")) {
        slots[2] = "call-any";
    }
    return slots;
}