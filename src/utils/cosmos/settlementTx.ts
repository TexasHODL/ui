/**
 * Settlement-tx signing for the optimistic gateway (poker-vm spec §6.10).
 *
 * Gameplay actions are signed as a cosmos MsgPerformAction TxRaw (SDK
 * signPerformAction, no broadcast) and attached to the gateway POST; the
 * gateway relays the bytes to the chain's existing pipeline. This is ADDITIVE
 * — the EIP-191 gateway action still drives gameplay; the tx is best-effort
 * settlement.
 *
 * Money-movers (join / leave / top-up) are signed as their DEDICATED message
 * (MsgJoinGame / MsgLeaveGame / MsgTopUp) instead — a MsgPerformAction does no
 * bank movement, so relaying one would settle the action without moving funds
 * (block52/poker-vm#2325). The player signs; the gateway relays the correct
 * message after PVM-verifying the optimistic apply.
 *
 * Sequence is tracked LOCALLY (query the account once, +1 per signed action):
 * optimistic actions are signed faster than the chain commits, so a
 * per-action sequence query would return the stale committed value.
 *
 * Graceful degradation:
 *   - account not on-chain (unfunded) → no tx (gameplay still works, no settlement)
 *   - sign error → no tx + sequence reset so the next action re-syncs
 */
import { NonPlayerActionType } from "@block52/poker-vm-sdk";
import { hasElements } from "../guards";
import type { SigningCosmosClient, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";

import type { NetworkEndpoints } from "../../context/NetworkContext";
import { getCosmosUrls } from "./client";

interface SeqState {
    accountNumber: number;
    sequence: number;
}

const seqByAddress = new Map<string, SeqState>();
const unfundedWarned = new Set<string>();

/** Clears tracked sequence so the next action re-fetches it (call on re-sync). */
export function resetSettlementSequence(address: string): void {
    seqByAddress.delete(address);
}

/**
 * Derives the place-1-first finishing order (player addresses) from a finished
 * SNG's results[]. Empty when the game isn't finalized (no results), so the
 * chain falls back to its own state for cash/already-finalized leaves. The
 * chain re-validates this ordering and owns the payout amounts (pokerchain#229);
 * we only report who finished where, from the gateway-broadcast results.
 */
export function finishingOrderFromState(gameState: TexasHoldemStateDTO | undefined): string[] {
    const results = gameState?.results;
    if (!hasElements(results)) {
        return [];
    }
    return [...results].sort((a, b) => a.place - b.place).map(r => r.playerId);
}

async function loadSeqState(address: string, restEndpoint: string): Promise<SeqState | null> {
    const cached = seqByAddress.get(address);
    if (cached) {
        return cached;
    }
    try {
        const res = await fetch(`${restEndpoint}/cosmos/auth/v1beta1/accounts/${address}`);
        if (!res.ok) {
            // 404 = account doesn't exist on-chain (unfunded). Settle nothing.
            if (!unfundedWarned.has(address)) {
                console.error(`[settlement] account ${address} not on-chain (unfunded) — actions play but won't settle until funded`);
                unfundedWarned.add(address);
            }
            return null;
        }
        const body = await res.json();
        if (!body.account) {
            return null;
        }
        const state: SeqState = {
            accountNumber: Number(body.account.account_number),
            sequence: Number(body.account.sequence)
        };
        seqByAddress.set(address, state);
        return state;
    } catch (err) {
        console.error("[settlement] failed to load account sequence:", err);
        return null;
    }
}

/**
 * Signs the action as a cosmos tx for settlement relay; returns the base64
 * TxRaw, or undefined when settlement isn't possible (unfunded account / sign
 * error) — in which case the caller proceeds with gameplay only.
 */
export async function signSettlementTx(
    signingClient: SigningCosmosClient,
    address: string,
    network: NetworkEndpoints,
    tableId: string,
    action: string,
    amount: bigint,
    data: string,
    finishingOrder: string[] = []
): Promise<string | undefined> {
    const { restEndpoint } = getCosmosUrls(network);
    const state = await loadSeqState(address, restEndpoint);
    if (!state) {
        return undefined;
    }
    const signerData = {
        accountNumber: state.accountNumber,
        sequence: state.sequence,
        chainId: COSMOS_CHAIN_ID
    };
    try {
        // Money-movers settle via their dedicated message (does the bank
        // movement); everything else is a MsgPerformAction. (#2325)
        const { base64 } = await signMoneyMover(signingClient, tableId, action, amount, data, signerData, finishingOrder)
            ?? await signingClient.signPerformAction(tableId, action, amount, data, signerData);
        state.sequence += 1; // advance locally for the next action
        return base64;
    } catch (err) {
        console.error("[settlement] sign failed, resetting sequence:", err);
        resetSettlementSequence(address);
        return undefined;
    }
}

/** Parses `seat=N` out of the join action's data field. */
function seatFromData(data: string): number {
    const match = /seat=(\d+)/.exec(data);
    if (!match) {
        throw new Error(`join settlement tx requires a seat in data, got: "${data}"`);
    }
    return parseInt(match[1], 10);
}

/**
 * Signs the dedicated money-mover message for join/leave/top-up, or returns
 * undefined for any other action (caller falls back to MsgPerformAction).
 * Returns the same {base64,...} shape as signPerformAction. (#2325)
 *
 * For a LEAVE on a finished SNG, `finishingOrder` (place-1-first addresses,
 * derived from the broadcast state's results[]) is attached so the chain can
 * finalize and pay the prize even though it never saw the tournament-ending
 * gameplay action under WS-first (pokerchain#229). Empty for everything else —
 * the chain ignores it for cash leaves and SNGs it already finalized.
 */
function signMoneyMover(
    signingClient: SigningCosmosClient,
    tableId: string,
    action: string,
    amount: bigint,
    data: string,
    signerData: { accountNumber: number; sequence: number; chainId: string },
    finishingOrder: string[]
): Promise<{ base64: string }> | undefined {
    switch (action) {
        case NonPlayerActionType.JOIN:
            return signingClient.signJoinGame(tableId, seatFromData(data), amount, signerData);
        case NonPlayerActionType.LEAVE:
            return signingClient.signLeaveGame(tableId, signerData, finishingOrder);
        case NonPlayerActionType.TOP_UP:
            return signingClient.signTopUp(tableId, amount, signerData);
        default:
            return undefined;
    }
}

// pokerchain chain id (matches COSMOS_CONSTANTS.CHAIN_ID; inlined to avoid a
// values import in this tx-signing util).
const COSMOS_CHAIN_ID = "pokerchain";
