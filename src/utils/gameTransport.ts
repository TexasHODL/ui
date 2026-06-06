/**
 * Game transport selection — chain-direct (default) vs the optimistic WS
 * Action Gateway (poker-vm#2211, ui#440).
 *
 * Per the #433 lesson the migration is incremental: submission stays
 * request/response (gateway mode POSTs to /actions), only the state-update
 * path moves to the gateway socket. Flag-gated for now; promoting the
 * selection into the NetworkContext dropdown is a planned follow-up.
 */
import { GatewayApi } from "../apis/GatewayApi";
import { viteEnv } from "./viteEnv";

export type GameTransport = "chain" | "gateway";

const DEFAULT_GATEWAY_URL = "https://pvm.block52.xyz/gateway";

export function getGameTransport(): GameTransport {
    const raw = (viteEnv.VITE_GAME_TRANSPORT || "").toLowerCase();
    return raw === "gateway" ? "gateway" : "chain";
}

export function getGatewayHttpUrl(): string {
    return viteEnv.VITE_GATEWAY_URL || DEFAULT_GATEWAY_URL;
}

/** Derives the gateway's WebSocket endpoint from its HTTP base URL. */
export function getGatewayWsUrl(): string {
    const base = getGatewayHttpUrl().replace(/\/$/, "");
    return `${base.replace(/^http/, "ws")}/ws`;
}

let cachedApi: { url: string; api: GatewayApi } | null = null;

/** Memoized GatewayApi (module-level until the NetworkContext dropdown lands). */
export function getGatewayApi(): GatewayApi {
    const url = getGatewayHttpUrl();
    if (!cachedApi || cachedApi.url !== url) {
        cachedApi = { url, api: new GatewayApi({ baseUrl: url, secure: false }) };
    }
    return cachedApi.api;
}

/**
 * Gateway WS state message, carrying the canonical GameStateResponseDTO
 * shape in `state` (poker-vm#2226).
 */
interface GatewayStateMessage {
    type?: string;
    gameId?: string;
    state?: {
        gameId?: string;
        format?: string;
        variant?: string;
        gameState?: unknown;
    };
}

/**
 * Normalizes a gateway WS state message into the canonical Cosmos message
 * shape ({gameId, event: "state", data: {format, variant, gameState}}) so
 * GameStateContext's existing handler processes it with zero new parsing.
 * Returns null for non-state gateway messages (subscribed/ack) and for
 * anything that is not a gateway state message.
 */
export function normalizeGatewayMessage(message: GatewayStateMessage): { gameId: string; event: "state"; data: unknown } | null {
    if (message.type !== "state" || !message.gameId || !message.state) {
        return null;
    }
    const { format, variant, gameState } = message.state;
    if (!gameState) {
        return null;
    }
    return {
        gameId: message.gameId,
        event: "state",
        data: { format, variant, gameState }
    };
}
