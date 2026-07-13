/**
 * WS Action Bus feature flag (Phase 1).
 *
 * The bus is the DEFAULT ingest path. Set VITE_GAME_BUS=off to fall back to the
 * direct classify-and-apply path during rollout (flag and fallback removed in
 * Phase 4 — no long-term dual paths). Read through viteEnv like every other
 * VITE flag (see getGameTransport in utils/gameTransport.ts).
 */
import { viteEnv } from "../utils/viteEnv";

export function isGameBusEnabled(): boolean {
    return (viteEnv.VITE_GAME_BUS || "").toLowerCase() !== "off";
}
