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
import { webcrypto } from "node:crypto";

const COSMOS_HD_PATH = "m/44'/118'/0'/0/0";
const TABLE_ADDRESS = "b521qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6qtnh3";
// Production-scale amounts: micro-USDC, 6 decimals — matching live chain
// tables ({"minBuyIn":"100000","smallBlind":"10000",...}) so the FE's
// USDC->micro conversion in the join modal lands inside the buy-in range.
const SMALL_BLIND = "10000"; // $0.01
const BIG_BLIND = "20000"; // $0.02
const MIN_BUY_IN = "100000"; // $0.10
const MAX_BUY_IN = "2000000"; // $2.00
const BUY_IN = "1000000"; // $1.00

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
}

const gatewayUrl = arg("gateway", "https://pvm.block52.xyz/gateway").replace(/\/$/, "");
const stopAfter = arg("stop-after", "deal"); // none | join | blinds | deal (none = empty table, join from the UI)
// Game ids are 0x hashes on-chain — match that shape so FE routing,
// explorers, and any id-format assumptions behave like production.
const gameId = arg("table-id", ethers.keccak256(ethers.randomBytes(32)));

function shuffledDeck() {
    const cards = [];
    for (const s of ["C", "D", "H", "S"]) {
        for (const r of ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]) {
            cards.push(r + s);
        }
    }
    const rand = new Uint32Array(cards.length);
    webcrypto.getRandomValues(rand);
    for (let i = cards.length - 1; i > 0; i--) {
        const j = rand[i] % (i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.join("-");
}

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

// The engine embeds gameOptions in every state it emits, and FE components
// read state.gameOptions unguarded — so the seed state must carry it too,
// not just the record envelope.
const gameOptions = {
    minBuyIn: MIN_BUY_IN,
    maxBuyIn: MAX_BUY_IN,
    minPlayers: 2,
    maxPlayers: 9,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    timeout: 60000
};

await post("/tables", {
    gameId,
    record: {
        format: "cash",
        variant: "texas-holdem",
        gameOptions,
        // Complete TexasHoldemStateDTO shape: the engine emits every field
        // on each transition and FE components map over them unguarded, so
        // the seed state must be the full canonical empty table.
        state: {
            address: TABLE_ADDRESS,
            gameOptions,
            // CSPRNG-shuffled deck for hand 1 — without it the engine's
            // default deterministic deck deals the same board every time
            // (poker-vm#2221; chain VRF replaces this via pokerchain#217).
            deck: shuffledDeck(),
            dealer: null,
            smallBlindPosition: 0,
            bigBlindPosition: 0,
            players: [],
            communityCards: [],
            pots: ["0"],
            totalPot: "0",
            nextToAct: -1,
            previousActions: [],
            actionCount: 0,
            handNumber: 1,
            round: "ante",
            winners: [],
            results: [],
            legalActions: [],
            availableSeats: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            signature: "0x0000000000000000000000000000000000000000000000000000000000000000",
            now: Date.now()
        }
    }
});
console.log(`table ${gameId} created on ${gatewayUrl}`);

if (stopAfter === "none") {
    console.log("empty table — join from the UI (seat click -> gateway join)");
} else {
    await act(hero, "join", 1, BUY_IN, "seat=1");
await act(villain, "join", 2, BUY_IN, "seat=2");
if (stopAfter !== "join") {
    await act(hero, "post-small-blind", 3, SMALL_BLIND, "");
    await act(villain, "post-big-blind", 4, BIG_BLIND, "");
}
    if (stopAfter === "deal") {
        await act(hero, "deal", 5, "0", "");
        console.log("hand dealt — hero is seat 1 (small blind), next to act");
    }
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
