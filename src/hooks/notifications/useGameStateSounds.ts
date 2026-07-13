import { useEffect } from "react";
import { useGameEvents } from "../game/useGameEvents";
import { useActionSounds } from "./useActionSounds";
import { getCosmosAddressSync } from "../../utils/cosmosAccountUtils";
import { hasElements } from "../../utils/guards";
import { getActionSoundKey } from "../../utils/actionSoundUtils";

/**
 * Plays action sounds for ALL players at the table by watching the shared game state.
 *
 * Unlike useActionSounds (which only triggers when the *local* user clicks a button),
 * this hook plays the appropriate sound whenever a new action is committed —
 * regardless of which player performed it.
 *
 * Migrated to the WS Action Bus (Phase 2): it now consumes `playerActed` events
 * from `useGameEvents` instead of hand-rolling its own `lastPlayedIndexRef` /
 * `lastHandNumberRef` snapshot diffing. The bus derives events with a single
 * persistent (globally-monotonic) index baseline, so:
 *   - a duplicate frame or resubscribe derives zero events → no replayed sound;
 *   - a hand rollover only emits the genuinely-new actions → no replay;
 *   - the first frame after subscribe carries no events → no replay of history.
 *
 * Mount this once inside the Table component.
 *
 * NOTE: Actions from the local player are skipped here because PokerActionPanel
 * already plays a sound on button click (optimistic). Playing again on the
 * WebSocket echo would cause every local action to sound twice.
 *
 * Sound mapping is preserved exactly (getActionSoundKey): blind posts map to the
 * "check" sound, `deal` and other non-player actions map to null (no sound).
 *
 * @param enabled - Whether sounds are enabled (driven by GameSettings playerActionSounds)
 */
export const useGameStateSounds = (enabled: boolean): void => {
    const playerActedEvents = useGameEvents("playerActed");
    const { playActionSound } = useActionSounds();
    const localAddress = getCosmosAddressSync();

    useEffect(() => {
        if (!enabled) return;
        if (!hasElements(playerActedEvents)) return;

        // Preserve prior behavior: play only the newest action's sound per
        // commit. Events are ordered by index, so the last one is the newest.
        const latestAction = playerActedEvents[playerActedEvents.length - 1].action;

        // Skip actions from the local player — PokerActionPanel already plays
        // a sound optimistically on click, so we only fire for other players.
        if (localAddress && latestAction.playerId === localAddress) return;

        const soundKey = getActionSoundKey(latestAction.action);

        if (soundKey) {
            playActionSound(soundKey);
        }
    }, [playerActedEvents, enabled, localAddress, playActionSound]);
};
