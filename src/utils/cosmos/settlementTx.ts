/**
 * Settlement-tx signing for the optimistic gateway (poker-vm spec §6.10).
 *
 * In gateway mode each action is signed as a cosmos MsgPerformAction TxRaw
 * (SDK signPerformAction, no broadcast) and attached to the gateway POST;
 * the gateway relays the bytes to the chain's existing pipeline so balances
 * settle at the boundaries (hand-end/leave). This is ADDITIVE — the EIP-191
 * gateway action still drives gameplay; the tx is best-effort settlement.
 *
 * Sequence is tracked LOCALLY (query the account once, +1 per signed action):
 * optimistic actions are signed faster than the chain commits, so a
 * per-action sequence query would return the stale committed value.
 *
 * Graceful degradation:
 *   - account not on-chain (unfunded) → no tx (gameplay still works, no settlement)
 *   - sign error → no tx + sequence reset so the next action re-syncs
 */
import type { SigningCosmosClient } from "@block52/poker-vm-sdk";

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
    data: string
): Promise<string | undefined> {
    const { restEndpoint } = getCosmosUrls(network);
    const state = await loadSeqState(address, restEndpoint);
    if (!state) {
        return undefined;
    }
    try {
        const { base64 } = await signingClient.signPerformAction(tableId, action, amount, data, {
            accountNumber: state.accountNumber,
            sequence: state.sequence,
            chainId: COSMOS_CHAIN_ID
        });
        state.sequence += 1; // advance locally for the next action
        return base64;
    } catch (err) {
        console.error("[settlement] sign failed, resetting sequence:", err);
        resetSettlementSequence(address);
        return undefined;
    }
}

// pokerchain chain id (matches COSMOS_CONSTANTS.CHAIN_ID; inlined to avoid a
// values import in this tx-signing util).
const COSMOS_CHAIN_ID = "pokerchain";
