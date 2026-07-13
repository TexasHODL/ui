/**
 * communityCardStagger decorator (WS Action Bus, Phase 3 — plan §2.4).
 *
 * When a commit advances the street AND deals new community cards
 * (`roundAdvanced` with a non-empty `newCommunityCards`), attach a `dealCards`
 * animation hint carrying the newly-dealt cards, the street, and the per-card
 * stagger. This replaces the hard-coded 1000/1100/1200ms timers in
 * useCardAnimations, and crucially fires on EVERY street (flop, turn, river) —
 * fixing the old "flop only, never turn/river" bug — because it keys off the
 * derived event, not a `communityCards.length >= 3` boolean.
 *
 * This is an animation HINT only — it deliberately does NOT set a pacing delay
 * (`minDisplayMs`/`holdPreviousMs`), so normal betting flow is never slowed; the
 * cards animate in over the render layer while the next action can still arrive.
 *
 * Pure function; unit-tested in isolation.
 */
import type { Decorator, Decoration, AnimationHint } from "../types";

/** Per-card reveal stagger (ms) for a newly-dealt street. */
export const CARD_STAGGER_MS = 100;

export const communityCardStagger: Decorator = (item): Partial<Decoration> => {
    const animations: AnimationHint[] = [];
    for (const event of item.events) {
        if (event.type === "roundAdvanced" && event.newCommunityCards.length > 0) {
            animations.push({
                kind: "dealCards",
                staggerMs: CARD_STAGGER_MS,
                cards: event.newCommunityCards,
                round: event.to
            });
        }
    }
    return animations.length > 0 ? { animations } : {};
};
