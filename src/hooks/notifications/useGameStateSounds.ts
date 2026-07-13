import { useEffect } from "react";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { useActionSounds } from "./useActionSounds";
import { getCosmosAddressSync } from "../../utils/cosmosAccountUtils";
import { getActionSoundKey } from "../../utils/actionSoundUtils";
import { isGameBusEnabled } from "../../bus/featureFlag";
import type { GameEvent } from "../../bus/types";

/**
 * Plays action sounds for ALL players at the table by watching the shared game state.
 *
 * Unlike useActionSounds (which only triggers when the *local* user clicks a button),
 * this hook plays the appropriate sound whenever a new action is committed —
 * regardless of which player performed it.
 *
 * Migrated to decoration hints (WS Action Bus, Phase 3): on the bus path the
 * `remoteActionSound` decorator resolves the sound (skipping the local player and
 * mapping via getActionSoundKey) at ingest, so this hook simply plays the newest
 * `decoration.sounds` hint of each committed item — sound stays synced with the
 * visual commit (plan open-question 1: sounds fire at commit, not ingest).
 *
 * Direct path (VITE_GAME_BUS=off): decorators don't run, so the decoration is
 * inert. The committed item still carries derived `events`, so we fall back to
 * deriving the sound from `playerActed` events inline — identical behavior,
 * reduced only in that it shares no decorator hint. Documented graceful
 * degradation; the flag and this fallback are removed in Phase 4.
 *
 * Mount this once inside the Table component.
 *
 * NOTE: Actions from the local player are skipped (both paths) because
 * PokerActionPanel already plays a sound on button click (optimistic). Playing
 * again on the WebSocket echo would sound every local action twice.
 *
 * @param enabled - Whether sounds are enabled (driven by GameSettings playerActionSounds)
 */
export const useGameStateSounds = (enabled: boolean): void => {
    const { latestItem } = useGameEventsContext();
    const { playActionSound } = useActionSounds();
    const localAddress = getCosmosAddressSync();

    useEffect(() => {
        if (!enabled || !latestItem) return;

        // Bus path: play the newest resolved sound hint (index-ordered, so the
        // last hint is the newest action).
        const soundHints = latestItem.decoration.sounds;
        if (soundHints.length > 0) {
            playActionSound(soundHints[soundHints.length - 1].kind);
            return;
        }

        // Only the direct path falls through here — on the bus path an empty
        // hints array means "nothing to sound" (e.g. local-only action).
        if (isGameBusEnabled()) return;

        const actedEvents = latestItem.events.filter(
            (event): event is Extract<GameEvent, { type: "playerActed" }> => event.type === "playerActed"
        );
        if (actedEvents.length === 0) return;

        const latestAction = actedEvents[actedEvents.length - 1].action;
        if (localAddress && latestAction.playerId === localAddress) return;

        const soundKey = getActionSoundKey(latestAction.action);
        if (soundKey) {
            playActionSound(soundKey);
        }
    }, [latestItem, enabled, localAddress, playActionSound]);
};
