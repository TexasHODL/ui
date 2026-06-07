#!/usr/bin/env node
/**
 * Seed a fresh table on the WS Action Gateway and deal a heads-up hand —
 * fully self-service end-to-end testing for gateway transport mode (ui#440).
 *
 *   node scripts/seed-gateway-table.mjs                       # two fresh wallets
 *   node scripts/seed-gateway-table.mjs --mnemonic "12 words" # you as seat 1
 *   node scripts/seed-gateway-table.mjs --stop-after blinds   # deal it yourself*
 *   node scripts/seed-gateway-table.mjs --gateway http://localhost:8546
 *
 * Prints the table URL plus localStorage snippets for BOTH seats — open the
 * hero in your normal browser and the villain in an incognito window to play
 * both sides of the hand through the gateway.
 *
 * (*note: the FE routes deal/new-hand chain-direct per poker-vm#2221, so on
 * a gateway-only table the deal must come from this script.)
 *
 * Key derivation matches the FE (utils/cosmos/signing.ts): ethers
 * HDNodeWallet at m/44'/118'/0'/0/0; address = bech32(b52,
 * ripemd160(sha256(compressed pubkey))) — verified byte-identical to the
 * gateway's Go auth package.
 */
import { ethers } from "ethers";
import { bech32 } from "bech32";

const COSMOS_HD_PATH = "m/44'/118'/0'/0/0";
const TABLE_ADDRESS = "b521qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6qtnh3";
const ONE_TOKEN = "100000000000000000";
const TWO_TOKENS = "200000000000000000";
const ONE_HUNDRED_TOKENS = "100000000000000000000";

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
}

const gatewayUrl = arg("gateway", "https://pvm.block52.xyz/gateway").replace(/\/$/, "");
const stopAfter = arg("stop-after", "deal"); // join | blinds | deal
const gameId = arg("table-id", `seeded-${Date.now()}`);

function makeWallet(mnemonic) {
    const wallet = mnemonic
        ? ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, COSMOS_HD_PATH)
        : ethers.HDNodeWallet.createRandom(undefined, COSMOS_HD_PATH);
    const pub = ethers.SigningKey.computePublicKey(wallet.privateKey, true);
    const ripe = ethers.ripemd160(ethers.sha256(pub));
    const address = bech32.encode("b52", bech32.toWords(ethers.getBytes(ripe)));
    return { wallet, address, mnemonic: wallet.mnemonic?.phrase ?? mnemonic };
}

async function post(path, body) {
    const res = await fetch(`${gatewayUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`POST ${path} -> HTTP ${res.status}: ${text}`);
    }
    return JSON.parse(text);
}

// Same canonical payload as utils/cosmos/signing.ts buildActionPayload.
async function act(player, action, index, amount, data) {
    const timestamp = Date.now();
    const payload = `pokerchain-action:${gameId}:${action}:${index}:${amount}:${timestamp}:${data}`;
    const signature = await player.wallet.signMessage(payload);
    await post("/actions", {
        gameId,
        action,
        index,
        amount,
        timestamp,
        address: player.address,
        signature,
        data
    });
    console.log(`  ${index} ${action.padEnd(16)} ok (${player.address.slice(0, 14)}…)`);
}

const hero = makeWallet(arg("mnemonic"));
const villain = makeWallet();

await post("/tables", {
    gameId,
    record: {
        format: "cash",
        variant: "texas-holdem",
        gameOptions: {
            minBuyIn: ONE_HUNDRED_TOKENS,
            maxBuyIn: "1000000000000000000000",
            minPlayers: 2,
            maxPlayers: 9,
            smallBlind: ONE_TOKEN,
            bigBlind: TWO_TOKENS,
            timeout: 60000
        },
        state: {
            address: TABLE_ADDRESS,
            dealer: null,
            round: "ante",
            communityCards: [],
            players: [],
            now: Date.now()
        }
    }
});
console.log(`table ${gameId} created on ${gatewayUrl}`);

await act(hero, "join", 1, ONE_HUNDRED_TOKENS, "seat=1");
await act(villain, "join", 2, ONE_HUNDRED_TOKENS, "seat=2");
if (stopAfter !== "join") {
    await act(hero, "post-small-blind", 3, ONE_TOKEN, "");
    await act(villain, "post-big-blind", 4, TWO_TOKENS, "");
}
if (stopAfter === "deal") {
    await act(hero, "deal", 5, "0", "");
    console.log("hand dealt — hero is seat 1 (small blind), next to act");
}

const snippet = w =>
    `localStorage.setItem("user_cosmos_mnemonic", "${w.mnemonic}");\n` +
    `localStorage.setItem("user_cosmos_address", "${w.address}");`;

console.log(`
================================================================
TABLE  http://localhost:5174/table/${gameId}

HERO (seat 1 — paste in your main browser console, then refresh)
${snippet(hero)}

VILLAIN (seat 2 — paste in an INCOGNITO window console, then refresh)
${snippet(villain)}

(throwaway test keys — gateway-only, never funded)
================================================================`);
