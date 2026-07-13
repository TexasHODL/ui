import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { gatewayStateMessage } from "./state.js";

/**
 * Gateway WebSocket hub (the WS half of the stub gateway). The UI connects to
 * ws://<gateway>/ws, sends {type:"subscribe", gameId, address, ...} on open, and
 * expects a {type:"state", gameId, state:{format,variant,gameState}} frame back
 * — GameStateContext errors after 5s of silence, so we reply immediately on
 * subscribe. Later state changes (M3 actions) are pushed via broadcast().
 *
 * Analogous to api-stub's SignalR hub, minus the legacy 2.x envelope.
 */

const WS_PATH = "/gateway/ws";

// gameId -> set of sockets subscribed to it, so an action broadcast only wakes
// the clients watching that table.
const subscribers = new Map<string, Set<WebSocket>>();

export function attachGatewayWs(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const path = (req.url ?? "").split("?")[0].replace(/\/{2,}/g, "/");
    if (path !== WS_PATH) {
      socket.destroy(); // not our socket — refuse rather than swallow
      return;
    }
    wss.handleUpgrade(req, socket, head, (client) => onConnect(client));
  });

  console.log(`[pvm-stub] gateway WS listening on ${WS_PATH}`);
}

function onConnect(client: WebSocket): void {
  let subscribedGameId: string | null = null;

  client.on("message", (raw) => {
    let msg: { type?: string; gameId?: string };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore non-JSON
    }

    if (msg.type === "subscribe" && typeof msg.gameId === "string") {
      subscribedGameId = msg.gameId;
      addSubscriber(msg.gameId, client);
      // Ack, then immediately send current state (beats the 5s fallback timeout).
      client.send(JSON.stringify({ type: "subscribed", gameId: msg.gameId }));
      sendState(client, msg.gameId);
    }
  });

  client.on("close", () => {
    if (subscribedGameId) removeSubscriber(subscribedGameId, client);
  });
  client.on("error", () => {
    if (subscribedGameId) removeSubscriber(subscribedGameId, client);
  });
}

function sendState(client: WebSocket, gameId: string): void {
  const message = gatewayStateMessage(gameId);
  if (message && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

/** Push the current state of a game to every subscriber (call after a mutation). */
export function broadcast(gameId: string): void {
  const set = subscribers.get(gameId);
  if (!set) return;
  const message = gatewayStateMessage(gameId);
  if (!message) return;
  const payload = JSON.stringify(message);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

/**
 * Push an arbitrary, pre-built frame to every subscriber of a game. Used by
 * per-frame broadcasting (captured intermediate states) and by
 * POST /__control/inject (arbitrary/duplicate/malformed frames). `frame` is an
 * already-shaped message object (or string) — sent verbatim.
 */
export function broadcastRaw(gameId: string, frame: unknown): void {
  const set = subscribers.get(gameId);
  if (!set) return;
  const payload = typeof frame === "string" ? frame : JSON.stringify(frame);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function addSubscriber(gameId: string, client: WebSocket): void {
  let set = subscribers.get(gameId);
  if (!set) {
    set = new Set();
    subscribers.set(gameId, set);
  }
  set.add(client);
}

function removeSubscriber(gameId: string, client: WebSocket): void {
  subscribers.get(gameId)?.delete(client);
}
