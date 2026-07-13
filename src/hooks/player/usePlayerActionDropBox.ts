import { useState, useEffect, useMemo, useRef } from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { useGameEvents } from "../game/useGameEvents";
import { PlayerActionType, NonPlayerActionType } from "@block52/poker-vm-sdk";
import { formatForSitAndGo, formatUSDCToSimpleDollars } from "../../utils/numberUtils";
import { isTournamentFormat } from "../../utils/gameFormatUtils";
import { isBlank } from "../../utils/guards";

export interface PlayerActionDisplay {
  action: string;
  amount?: string;
  isVisible: boolean;
  isTextHiding: boolean;
  isAnimatingOut: boolean;
}

const SHOW_DURATION = 2000;
const TEXT_HIDE_DURATION = 150;
const EXIT_ANIMATION_DURATION = 500;

const HIDDEN: PlayerActionDisplay = {
  action: "",
  amount: "",
  isVisible: false,
  isTextHiding: false,
  isAnimatingOut: false
};

// Map action types to display text using the actual enum values
const ACTION_DISPLAY_MAP: Record<string, string> = {
  // Use PlayerActionType enum values
  [PlayerActionType.BET]: "BET",
  [PlayerActionType.CALL]: "CALL",
  [PlayerActionType.RAISE]: "RAISE",
  [PlayerActionType.FOLD]: "FOLD",
  [PlayerActionType.ALL_IN]: "ALL IN",
  [PlayerActionType.SMALL_BLIND]: "POST SB",
  [PlayerActionType.BIG_BLIND]: "POST BB",
  [PlayerActionType.CHECK]: "CHECK",
  [PlayerActionType.SHOW]: "SHOW",
  [PlayerActionType.MUCK]: "MUCK",
  [NonPlayerActionType.SIT_OUT]: "SITTING OUT",
  [NonPlayerActionType.SIT_IN]: "SIT IN",

  // Non-player actions - we'll filter these out mostly
  "join": "JOINED",
  "leave": "LEFT",
  "deal": "DEAL",
  "new-hand": "NEW HAND",

  // Status indicators (for potential future use)
  "winner": "WINNER"
};

// Actions that should NOT trigger the display (too frequent/not relevant)
const FILTERED_ACTIONS = ["join", "deal", "new-hand"];

// Format an action's amount for the badge under a player's avatar.
// Tournaments carry raw whole chips on the wire (e.g. "5" → " 5"); cash carries
// USDC micro-units (÷10^6, e.g. "5000000" → " $5.00"). Mirrors Chip.tsx's split
// so SNG amounts aren't mis-formatted as micro-USDC and shown as "$0.00" (#487).
export const formatActionAmount = (amount: string | undefined, isTournament: boolean): string => {
  if (isBlank(amount)) return "";

  const numeric = Number(amount);
  if (numeric === 0 || Number.isNaN(numeric)) return "";

  return isTournament ? ` ${formatForSitAndGo(numeric)}` : ` $${formatUSDCToSimpleDollars(amount)}`;
};

/**
 * Drives the transient "action badge" under a player's avatar.
 *
 * Migrated to the WS Action Bus (Phase 3): new-action detection now reads the
 * committed item's `playerActed` events (via useGameEvents) instead of the old
 * `actionKey` string diffed against a ref. The bus derives one `playerActed` per
 * new action with a globally-monotonic index baseline, so a duplicate frame /
 * resubscribe / hand rollover no longer re-fires the badge, and there is no
 * per-hand reset logic to get wrong.
 *
 * Behavior preserved: only the GLOBALLY-newest action shows (a player's badge
 * hides the instant another player acts), filtered actions (join/deal/new-hand)
 * never show, and the show(2000ms) → text-hide(150ms) → animate-out(500ms)
 * choreography and return shape are unchanged (the Badge component consumes them
 * as-is, so it needs no change).
 */
export const usePlayerActionDropBox = (seatIndex: number): PlayerActionDisplay => {
  // Tournament/SNG amounts are raw chips; cash amounts are USDC micro-units.
  const { gameFormat } = useGameStateContext();
  const isTournament = isTournamentFormat(gameFormat);

  // Newest actions committed this frame (index-ordered; last is globally newest).
  const playerActedEvents = useGameEvents("playerActed");

  const [displayState, setDisplayState] = useState<PlayerActionDisplay>(HIDDEN);

  // All pending choreography timers, cleared on a new action / unmount.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // The globally-newest, non-filtered action on this commit (or null).
  const latestAction = useMemo(() => {
    if (playerActedEvents.length === 0) return null;
    const newest = playerActedEvents[playerActedEvents.length - 1].action;
    if (FILTERED_ACTIONS.includes(newest.action.toLowerCase())) return null;
    return newest;
  }, [playerActedEvents]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // No new action this commit (duplicate frame, no-op frame, or filtered): do
    // not disturb an in-progress badge — it follows its own timeout.
    if (!latestAction) return;

    // Someone else is now the newest actor — hide this seat's badge at once.
    if (latestAction.seat !== seatIndex) {
      clearTimers();
      setDisplayState(HIDDEN);
      return;
    }

    // This seat performed the newest action — show it, then run the choreography.
    clearTimers();
    setDisplayState({
      action: ACTION_DISPLAY_MAP[latestAction.action] || latestAction.action.toUpperCase(),
      amount: formatActionAmount(latestAction.amount, isTournament),
      isVisible: true,
      isTextHiding: false,
      isAnimatingOut: false
    });

    timersRef.current.push(
      setTimeout(() => {
        setDisplayState(prev => ({ ...prev, isTextHiding: true }));
        timersRef.current.push(
          setTimeout(() => {
            setDisplayState(prev => ({ ...prev, isAnimatingOut: true }));
            timersRef.current.push(
              setTimeout(() => setDisplayState(HIDDEN), EXIT_ANIMATION_DURATION)
            );
          }, TEXT_HIDE_DURATION)
        );
      }, SHOW_DURATION)
    );
  }, [latestAction, seatIndex, isTournament]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cleanup timeouts on unmount
  useEffect(() => () => clearTimers(), []);

  return displayState;
};
