// Types from CosmosClient
export interface CosmosBlock {
    block_id: {
        hash: string;
    };
    block: {
        header: {
            height: string;
            time: string;
            chain_id: string;
            proposer_address: string;
        };
        data: {
            txs: string[]; // Base64 encoded transactions
        };
    };
}

// Types for balance and transactions
export interface Coin {
    denom: string;
    amount: string;
}

export interface Transaction {
    txhash: string;
    height: string;
    code: number;
    timestamp: string;
    tx: {
        body: {
            messages: any[];
        };
    };
    events?: any[];
}

// Types for Cosmos transaction
export interface CosmosTransaction {
    tx: {
        body: {
            messages: any[];
        };
    };
    tx_response: {
        height: string;
        txhash: string;
        code: number;
        gas_used: string;
        gas_wanted: string;
        timestamp: string;
        events: any[];
    };
}

// Card distribution analytics
export interface CardDistribution {
    [cardMnemonic: string]: number; // e.g., { "AS": 42, "KD": 38, ... }
}
