// Dealer bot: watches a gateway table over WS and fires the chain-anchored
// actions (deal / new-hand) the FE intentionally doesn't send on
// gateway-only tables (poker-vm#2221). Signs as the hero wallet, but only
// ever performs dealer actions — never player decisions.
import { ethers } from "ethers";
import { bech32 } from "bech32";
import WebSocket from "ws";

const [mnemonic, gameId] = process.argv.slice(2);
const GATEWAY = "https://pvm.block52.xyz/gateway";
const WS_URL = "wss://pvm.block52.xyz/gateway/ws";

const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/118'/0'/0/0");
const pub = ethers.SigningKey.computePublicKey(wallet.privateKey, true);
const address = bech32.encode("b52", bech32.toWords(ethers.getBytes(ethers.ripemd160(ethers.sha256(pub)))));
console.log(`dealer-bot: watching ${gameId} as ${address}`);

let busy = false;

async function send(action, index, data) {
    const timestamp = Date.now();
    const payload = `pokerchain-action:${gameId}:${action}:${index}:0:${timestamp}:${data}`;
    const signature = await wallet.signMessage(payload);
    const res = await fetch(`${GATEWAY}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, action, index, amount: "0", timestamp, address, signature, data })
    });
    console.log(`dealer-bot: ${action} (index ${index}) -> ${res.status} ${res.ok ? "OK" : await res.text()}`);
}

function onState(state) {
    const gameState = state?.gameState ?? state;
    const me = gameState?.players?.find(p => p.address === address);
    const legal = me?.legalActions ?? [];
    const deal = legal.find(a => a.action === "deal");
    const newHand = legal.find(a => a.action === "new-hand");
    const next = deal ?? newHand;
    if (next && !busy) {
        busy = true;
        send(next.action, next.index, "").finally(() => setTimeout(() => { busy = false; }, 1500));
    }
}

const ws = new WebSocket(WS_URL);
ws.on("open", () => ws.send(JSON.stringify({ type: "subscribe", gameId })));
ws.on("message", raw => {
    try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "state" && msg.state) onState(msg.state);
        if (msg.type === "error") console.log("dealer-bot: gateway error:", msg.error);
    } catch { /* ignore */ }
});
ws.on("close", () => { console.log("dealer-bot: socket closed"); process.exit(0); });
setInterval(() => ws.ping?.(), 30000);
