import { useState, useEffect, useRef } from "react";
import { useGameStateContext } from "../../context/GameStateContext";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { CardAnimationsReturn } from "../../types/index";

/** Flip flags this hook exposes (flop = 3). */
const FLIP_SLOTS = 3;

/**
 * Custom hook to handle community-card deal animations.
 *
 * Driven by the WS Action Bus: it consumes the committed item's `dealCards`
 * animation hint (from the communityCardStagger decorator) plus the derived
 * `handStarted` event, instead of keying off a `communityCards.length >= 3`
 * boolean. This fixes two long-standing bugs:
 *
 *   - it now RE-TRIGGERS on turn and river (the boolean only ever went true once
 *     at the flop and never fired again); and
 *   - it RESETS per hand on `handStarted` (the old flags never cleared, so a new
 *     hand started with the previous hand's cards already "flipped").
 *
 * @param _tableId The ID of the table (not used - Context manages subscription)
 * @returns Object containing animation state for cards
 */
export const useCardAnimations = (_tableId?: string): CardAnimationsReturn => {
    const [flipped1, setFlipped1] = useState(false);
    const [flipped2, setFlipped2] = useState(false);
    const [flipped3, setFlipped3] = useState(false);

    const { gameState } = useGameStateContext();
    const { latestItem } = useGameEventsContext();

    const communityCards = gameState?.communityCards || [];
    const showThreeCards = communityCards.length >= 3;

    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    const setFlipped = (slot: number, value: boolean) => {
        if (slot === 0) setFlipped1(value);
        else if (slot === 1) setFlipped2(value);
        else setFlipped3(value);
    };

    useEffect(() => {
        if (!latestItem) return;

        // Reset per hand: a new hand clears the board, so drop all flips.
        const handStarted = latestItem.events.some(event => event.type === "handStarted");
        if (handStarted) {
            clearTimers();
            setFlipped1(false);
            setFlipped2(false);
            setFlipped3(false);
        }

        // The communityCardStagger decorator attaches a `dealCards` hint carrying
        // the newly-dealt cards and the per-card stagger whenever the street
        // advances with new community cards.
        const dealHint = latestItem.decoration.animations.find(animation => animation.kind === "dealCards");
        if (!dealHint) return;

        const stagger = dealHint.staggerMs ?? 0;
        const newCardCount = dealHint.cards?.length ?? 0;
        const slotsToFlip = Math.min(newCardCount, FLIP_SLOTS);

        // Reset the flip flags, then stagger them in for the newly-dealt street —
        // fires on flop, turn, AND river (not just the flop).
        clearTimers();
        setFlipped1(false);
        setFlipped2(false);
        setFlipped3(false);
        for (let slot = 0; slot < slotsToFlip; slot++) {
            timersRef.current.push(setTimeout(() => setFlipped(slot, true), stagger * (slot + 1)));
        }
    }, [latestItem]);

    // Cleanup on unmount.
    useEffect(() => () => clearTimers(), []);

    return {
        flipped1,
        flipped2,
        flipped3,
        showThreeCards
    };
};
