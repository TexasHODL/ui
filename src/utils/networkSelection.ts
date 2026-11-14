import type { NetworkEndpoints } from "../context/NetworkContext";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { hasContent, hasValue, isBlank, isNullish, isRecord, isString } from "./guards";

/**
 * Host of the Texas Hodl node. Must match the Texas Hodl entry in NETWORK_PRESETS.
 * Devices that saved that node while it was the default are moved to Block52 once.
 */
export const TEXAS_HODL_NODE_HOST = "node.texashodl.net";

/** Preset name the network selector stores for the Texas Hodl node. */
export const TEXAS_HODL_NETWORK_NAME = "Texas Hodl";

/** Value of the one-time migration flag. Any other contents means it has not run. */
export const SELECTED_NETWORK_MIGRATION_VALUE = "1";

/** The slice of localStorage the network choice uses. */
export interface NetworkPreferenceStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

function endpointHost(endpoint: string | undefined): string | null {
    if (!isString(endpoint) || isBlank(endpoint)) return null;
    try {
        return new URL(endpoint).hostname;
    } catch {
        return null;
    }
}

/**
 * True when a saved network is the Texas Hodl node: the selector's preset name,
 * or any endpoint on node.texashodl.net. Other saved choices (localhost, a dev
 * URL, another preset) are not this node.
 */
export function isTexasHodlNode(network: Partial<NetworkEndpoints>): boolean {
    if (network.name === TEXAS_HODL_NETWORK_NAME) return true;
    return [network.rpc, network.rest, network.grpc, network.ws].some(endpoint => endpointHost(endpoint) === TEXAS_HODL_NODE_HOST);
}

function isStoredNetwork(value: unknown): value is NetworkEndpoints {
    if (!isRecord(value)) return false;
    return isString(value.name) && isString(value.rpc) && isString(value.rest) && isString(value.grpc) && isString(value.ws) && hasContent(value.ws);
}

function readSavedNetwork(raw: string | null): NetworkEndpoints | null {
    if (isNullish(raw)) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return isStoredNetwork(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Writes a key, returning false when storage rejects it (private mode, a
 * blocked partition). A failed write must not be treated as a finished migration.
 */
function trySet(storage: NetworkPreferenceStorage, key: string, value: string): boolean {
    try {
        storage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Network to boot with.
 *
 * No saved choice uses `defaultNetwork` (Block52, unless VITE_DEFAULT_NETWORK
 * names another preset). A saved Texas Hodl node is replaced with
 * `migrationTarget` (the Block52 preset) the first time this runs, and the
 * migration flag is stored so a later manual Texas Hodl choice stays. Every
 * other saved network is returned unchanged. The flag is set on that first
 * resolution either way, which is what makes the move one-time.
 */
export function resolveInitialNetwork(
    storage: NetworkPreferenceStorage,
    defaultNetwork: NetworkEndpoints,
    migrationTarget: NetworkEndpoints
): NetworkEndpoints {
    const selectedKey = STORAGE_KEYS.selectedNetwork;
    const migrationKey = STORAGE_KEYS.selectedNetworkMigratedToBlock52;
    const migrated = storage.getItem(migrationKey) === SELECTED_NETWORK_MIGRATION_VALUE;
    const saved = readSavedNetwork(storage.getItem(selectedKey));

    if (!migrated && hasValue(saved) && isTexasHodlNode(saved)) {
        const wroteNetwork = trySet(storage, selectedKey, JSON.stringify(migrationTarget));
        if (wroteNetwork) trySet(storage, migrationKey, SELECTED_NETWORK_MIGRATION_VALUE);
        return migrationTarget;
    }

    if (!migrated) trySet(storage, migrationKey, SELECTED_NETWORK_MIGRATION_VALUE);
    return hasValue(saved) ? saved : defaultNetwork;
}
