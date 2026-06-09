import HTTPClient, { HTTPClientConfig } from "./HTTPClient";

/**
 * Signed action submitted to the gateway. Same shape as the gateway's WS
 * "action" message (camelCase per Commandment #5); `signature` is the
 * EIP-191 signature from signActionMessage over buildActionPayload — every
 * field below except `clientTs` is bound into it.
 */
export interface GatewayActionRequest {
    gameId: string;
    action: string;
    index: number;
    amount: string;
    timestamp: number;
    address: string;
    signature: string;
    data: string;
    // tx is the base64 cosmos TxRaw for settlement relay (§6.10). Best-effort;
    // absent for unfunded accounts.
    tx?: string;
    clientTs?: number;
}

/**
 * Gateway response. On success (200): type "ack" with the post-action game
 * state — the submitter can render immediately, no socket round-trip
 * (the #433 acting-player problem). On rejection (422): type "error" with
 * the validation reason (bad signature, stale index, illegal action).
 */
export interface GatewayActionResponse {
    type: "ack" | "error";
    gameId?: string;
    index?: number;
    state?: unknown;
    error?: string;
    clientTs?: number;
}

/**
 * Client for the optimistic WS Action Gateway (poker-vm pvm/go/gateway,
 * live at https://pvm.block52.xyz/gateway/). Request/response submission
 * per the #433 lesson — table state broadcasts arrive over the gateway's
 * WebSocket, not through this client.
 */
export class GatewayApi extends HTTPClient {
    constructor(config: HTTPClientConfig) {
        super(config);
    }

    /** Submits a signed action; resolves with ack + post-action state. */
    public submitAction = (action: GatewayActionRequest): Promise<GatewayActionResponse> => this.post<GatewayActionResponse>("/actions", action);

    /** Gateway liveness probe. */
    public health = (): Promise<{ status: string }> => this.get<{ status: string }>("/health");
}
