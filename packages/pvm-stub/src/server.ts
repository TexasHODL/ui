import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { attachGatewayWs, broadcast } from "./gateway-ws.js";
import {
  applyAction,
  CASH_GAME_ID,
  getGameState,
  listGamesResponse,
  resetTables,
} from "./state.js";

/**
 * @block52/pvm-stub — local stub server so the UI runs with no chain, funds,
 * or bridge. Modeled on dynamiq/h3-portal/packages/api-stub.
 *
 * Point the UI at this via the "Stub" network preset (rest=http://localhost:8546)
 * and VITE_GATEWAY_URL=http://localhost:8546/gateway. See
 * ui/docs/plans/2026_07_11_wallet_stub_server.md.
 *
 * M1: funded balance + health.
 * M2 (this file): seeded lobby + game_state + gateway WS + action echo, so a
 *   table shows, opens, and renders. Actions are accepted and the current state
 *   re-broadcast (no hand logic yet — that's M3's holdem.ts + bot).
 */

const PORT = Number(process.env.PORT ?? 8546);
const HOST = process.env.HOST ?? "0.0.0.0";

const USDC_MICRO = process.env.STUB_USDC ?? "1000000000"; // 1000 USDC
const STAKE = process.env.STUB_STAKE ?? "1000000000"; // 1000 stake

const app = new Hono();
app.use("*", cors()); // dev/test only — the UI POSTs cross-origin

app.use("*", async (c, next) => {
  await next();
  console.log(`[pvm-stub] ${c.req.method} ${new URL(c.req.url).pathname} -> ${c.res.status}`);
});

// ---- health -------------------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok", pkg: "@block52/pvm-stub" }));
app.get("/gateway/health", (c) => c.json({ status: "ok" }));

// ---- wallet balance (unlocks buy-in) ------------------------------------
app.get("/cosmos/bank/v1beta1/balances/:address", (c) =>
  c.json({
    balances: [
      { denom: "usdc", amount: USDC_MICRO },
      { denom: "stake", amount: STAKE },
    ],
    pagination: { next_key: null, total: "2" },
  })
);

// ---- lobby + game state -------------------------------------------------
// `games` is a JSON-encoded STRING here (verified against live node1).
app.get("/block52/pokerchain/poker/v1/list_games", (c) => c.json(listGamesResponse()));

app.get("/block52/pokerchain/poker/v1/game_state/:gameId", (c) => {
  const state = getGameState(c.req.param("gameId"));
  return state ? c.json(state) : c.json({ error: "unknown gameId" }, 404);
});

// ---- gateway action submission ------------------------------------------
// M2: accept the action, re-broadcast current state, ack. M3 replaces this with
// holdem.ts (mutate state) + bot auto-play before the broadcast.
app.post("/gateway/actions", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    gameId?: string;
    action?: string;
    amount?: string;
    address?: string;
    data?: string;
    index?: number;
  };
  const gameId = body.gameId ?? CASH_GAME_ID;
  if (!getGameState(gameId)) {
    return c.json({ type: "error", error: `unknown gameId ${gameId}` }, 422);
  }
  // Mutate via the engine (join/fold/check/call/bet/raise), auto-run the bot,
  // then broadcast the resulting state to subscribers and ack the submitter.
  applyAction(gameId, {
    action: body.action ?? "",
    amount: body.amount,
    address: body.address,
    data: body.data,
    index: body.index,
  });
  broadcast(gameId);
  const state = getGameState(gameId)!;
  return c.json({
    type: "ack",
    gameId,
    index: body.index,
    state: { format: state.format, variant: state.variant, gameState: state.gameState },
  });
});

// ---- cosmetic reads the UI polls (benign shapes, stop the {} noise) ------
app.get("/cosmos/base/tendermint/v1beta1/blocks/latest", (c) =>
  c.json({ block: { header: { height: "1", time: "2026-07-11T00:00:00Z" } } })
);
app.get("/cosmos/tx/v1beta1/txs", (c) => c.json({ txs: [], tx_responses: [], total: "0" }));
app.get("/pokerchain/poker/nft_avatar/:address", (c) => c.json({ avatar: "" }));

// ---- control surface (test isolation) -----------------------------------
// Reset all game state to fresh/empty between test runs (api-stub's /__control
// pattern). No auth — the stub only runs in dev/test.
app.post("/__control/reset", (c) => {
  resetTables();
  return c.json({ ok: true });
});

// ---- unstubbed fallback -------------------------------------------------
app.all("*", (c) => {
  console.warn(`[pvm-stub] UNSTUBBED ${c.req.method} ${new URL(c.req.url).pathname} -> {} (TODO)`);
  return c.json({});
});

const server = serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[pvm-stub] listening on http://${HOST}:${info.port}`);
  console.log(`[pvm-stub] funded: ${Number(USDC_MICRO) / 1e6} USDC + ${STAKE} stake`);
  console.log(`[pvm-stub] seeded cash table: ${CASH_GAME_ID}`);
});

attachGatewayWs(server as unknown as Server);
