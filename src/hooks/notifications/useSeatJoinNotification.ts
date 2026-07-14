import { useState, useEffect, useRef, useCallback } from "react";
import { useGameEvents } from "../game/useGameEvents";
import { STORAGE_KEYS } from "../../constants/storageKeys";

export interface SeatJoinNotification {
  seatNumber: number;
  isVisible: boolean;
  isTextHiding: boolean;
  isAnimatingOut: boolean;
}

const DISPLAY_DURATION = 2000; // 2 seconds
const TEXT_HIDE_DURATION = 150; // 0.15 seconds
const EXIT_ANIMATION_DURATION = 500; // 0.5 seconds

/**
 * Hook to manage the "YOUR SEAT" join notification shown below a player's badge.
 *
 * Driven by the WS Action Bus: it consumes the derived `playerJoined` events
 * (via useGameEvents) instead of the old global `window` callback registry that
 * VacantPlayer used to fire imperatively. The notification fires only
 * for the LOCAL player's own join — a `playerJoined` event whose seat matches
 * this badge AND whose address is the local player's — preserving the prior
 * behavior (only the joining player saw the banner; other players' joins showed
 * nothing). Because the event arrives on the same commit that seats the player,
 * the badge is already mounted, so the old 100ms mount-delay hack in
 * VacantPlayer is no longer needed.
 *
 * The badge choreography is unchanged: show (2000ms) → text-hide (150ms) →
 * animate-out (500ms).
 */
export function useSeatJoinNotification(seatNumber: number): SeatJoinNotification {
  const [isVisible, setIsVisible] = useState(false);
  const [isTextHiding, setIsTextHiding] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const displayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local player address — read once (localStorage is synchronous).
  const [localAddress] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.cosmosAddress)?.toLowerCase() ?? null
  );

  // Derived join events on the latest commit (empty on most commits).
  const joinedEvents = useGameEvents("playerJoined");

  // Show the notification (called when the local player joins this seat).
  const showNotification = useCallback(() => {
    // Clear any existing timers
    if (displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
    }
    if (textHideTimerRef.current) {
      clearTimeout(textHideTimerRef.current);
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
    }

    // Show the notification
    setIsVisible(true);
    setIsTextHiding(false);
    setIsAnimatingOut(false);

    // Start exit animation after display duration
    displayTimerRef.current = setTimeout(() => {
      setIsTextHiding(true);

      textHideTimerRef.current = setTimeout(() => {
        setIsAnimatingOut(true);

        // Hide completely after exit animation
        exitTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          setIsTextHiding(false);
          setIsAnimatingOut(false);
        }, EXIT_ANIMATION_DURATION);
      }, TEXT_HIDE_DURATION);
    }, DISPLAY_DURATION);
  }, []);

  // Fire only for the LOCAL player's own join at this seat (preserves the
  // previous self-join-only behavior; other players' joins show nothing).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!localAddress) return;
    const selfJoined = joinedEvents.some(
      event => event.seat === seatNumber && event.address?.toLowerCase() === localAddress
    );
    if (selfJoined) {
      showNotification();
    }
  }, [joinedEvents, seatNumber, localAddress, showNotification]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (displayTimerRef.current) {
        clearTimeout(displayTimerRef.current);
      }
      if (textHideTimerRef.current) {
        clearTimeout(textHideTimerRef.current);
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  return {
    seatNumber,
    isVisible,
    isTextHiding,
    isAnimatingOut
  };
}
