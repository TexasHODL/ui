/**
 * Bridge deposits for an address.
 *
 * The chain credits a bridged USDC deposit in EndBlock (`bridge_deposit_processed`
 * finalize-block event), not in a transaction, so `/cosmos/tx/v1beta1/txs`
 * (message.sender / transfer.recipient) never returns it. CometBFT indexes
 * finalize-block events for `block_search`, so we find the blocks there and
 * read the amounts from `block_results`.
 */

/** Minimal CometBFT RPC surface used here (CometRpcApi implements it). */
export interface BlockEventRpc {
    blockSearch: (query: string, perPage?: number, orderBy?: "asc" | "desc") => Promise<unknown>;
    blockResults: (height: number | string) => Promise<unknown>;
}

export interface BridgeDeposit {
    height: string;
    timestamp: string;
    /** micro-USDC */
    amount: string;
    ethTxHash: string;
    nonce: string;
}

type RpcAttr = { key: string; value: string };
type RpcEvent = { type: string; attributes?: RpcAttr[] };
type RpcEnvelope<T> = T | { result?: T };
type BlockSearchResult = { blocks?: { block?: { header?: { height?: string; time?: string } } }[] };
type BlockResultsResult = { finalize_block_events?: RpcEvent[]; end_block_events?: RpcEvent[] };

export const BRIDGE_DEPOSIT_EVENT = "bridge_deposit_processed";

const unwrap = <T,>(r: RpcEnvelope<T>): T => ((r as { result?: T })?.result ?? (r as T)) || ({} as T);

/** Parse `bridge_deposit_processed` events for `address` out of one block's results. */
export function depositsFromBlockResults(results: BlockResultsResult, address: string, height: string, timestamp: string): BridgeDeposit[] {
    const events = [...(results.finalize_block_events ?? []), ...(results.end_block_events ?? [])];
    return events
        .filter(e => e.type === BRIDGE_DEPOSIT_EVENT)
        .map(e => Object.fromEntries((e.attributes ?? []).map(a => [a.key, a.value])) as Record<string, string>)
        .filter(a => a.recipient === address)
        .map(a => ({
            height,
            timestamp,
            amount: (a.amount || "0").replace(/[^0-9]/g, "") || "0",
            ethTxHash: a.eth_tx_hash || "",
            nonce: a.nonce || ""
        }));
}

/** Most recent bridge deposits credited to `address` (newest first). */
export async function fetchBridgeDeposits(rpc: BlockEventRpc, address: string, limit = 10): Promise<BridgeDeposit[]> {
    const search = unwrap<BlockSearchResult>((await rpc.blockSearch(`${BRIDGE_DEPOSIT_EVENT}.recipient='${address}'`, limit, "desc")) as RpcEnvelope<BlockSearchResult>);
    const blocks = (search.blocks ?? []).map(b => b.block?.header).filter((h): h is { height: string; time?: string } => !!h?.height);
    const perBlock = await Promise.all(
        blocks.map(async h => {
            const res = unwrap<BlockResultsResult>((await rpc.blockResults(h.height)) as RpcEnvelope<BlockResultsResult>);
            return depositsFromBlockResults(res, address, h.height, h.time ?? "");
        })
    );
    return perBlock.flat();
}
/** A deposit as a Recent Transactions / address-history row (no Cosmos tx: links to its block). */
export function bridgeDepositRow(d: BridgeDeposit) {
    return {
        txhash: `deposit-${d.height}-${d.nonce || d.ethTxHash}`,
        height: d.height,
        timestamp: d.timestamp,
        code: 0,
        label: "Deposit",
        messageType: "BridgeDeposit",
        transferAmount: d.amount,
        transferDirection: "received" as const,
        linkTo: `/explorer/block/${d.height}`,
        displayHash: d.ethTxHash || `block ${d.height}`
    };
}