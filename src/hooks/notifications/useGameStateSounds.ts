import { useEffect } from "react";
import { useGameEventsContext } from "../../context/gameState/GameEventsContext";
import { useActionSounds } from "./useActionSounds";

/**
 * Plays action sounds for ALL players at the table by watching the shared game state.
 *
 * Unlike useActionSounds (which only triggers when the *local* user clicks a button),
 * this hook plays the appropriate sound whenever a new action is committed —
 * regardless of which player performed it.
 *
 * Driven by the WS Action Bus: the `remoteActionSound` decorator resolves the
 * sound (skipping the local player and mapping via getActionSoundKey) at ingest,
 * so this hook simply plays the newest `decoration.sounds` hint of each committed
 * item — sound stays synced with the visual commit (plan open-question 1: sounds
 * fire at commit, not ingest).
 *
 * Mount this once inside the Table component.
 *
 * NOTE: Actions from the local player are skipped (by the decorator) because
 * PokerActionPanel already plays a sound on button click (optimistic). Playing
 * again on the WebSocket echo would sound every local action twice.
 *
 * @param enabled - Whether sounds are enabled (driven by GameSettings playerActionSounds)
 */
export const useGameStateSounds = (enabled: boolean): void => {
    const { latestItem } = useGameEventsContext();
    const { playActionSound } = useActionSounds();

    useEffect(() => {
        if (!enabled || !latestItem) return;

        // Play the newest resolved sound hint (index-ordered, so the last hint is
        // the newest action). An empty hints array means "nothing to sound"
        // (e.g. a local-only action the decorator skipped).
        const soundHints = latestItem.decoration.sounds;
        if (soundHints.length > 0) {
            playActionSound(soundHints[soundHints.length - 1].kind);
        }
    }, [latestItem, enabled, playActionSound]);
};
