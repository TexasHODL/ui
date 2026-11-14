import { NETWORK_PRESETS } from "../context/NetworkContext";
import { STORAGE_KEYS } from "../constants/storageKeys";
import {
    SELECTED_NETWORK_MIGRATION_VALUE,
    TEXAS_HODL_NODE_HOST,
    isTexasHodlNode,
    resolveInitialNetwork,
    type NetworkPreferenceStorage
} from "./networkSelection";
import type { NetworkEndpoints } from "../context/NetworkContext";

const block52 = NETWORK_PRESETS.find(network => network.name === "Block52") as NetworkEndpoints;
const texas = NETWORK_PRESETS.find(network => network.name === "Texas Hodl") as NetworkEndpoints;
const localhost = NETWORK_PRESETS.find(network => network.name === "Localhost") as NetworkEndpoints;

const dev: NetworkEndpoints = {
    name: "Dev",
    rpc: "http://192.168.1.20:26657",
    rest: "http://192.168.1.20:1317",
    grpc: "http://192.168.1.20:9090",
    ws: "ws://192.168.1.20:8585/ws"
};

function memoryStorage(initial: Record<string, string> = {}): NetworkPreferenceStorage & { snapshot(): Record<string, string> } {
    const data: Record<string, string> = { ...initial };
    return {
        getItem: key => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
        setItem: (key, value) => {
            data[key] = value;
        },
        snapshot: () => ({ ...data })
    };
}

function saved(network: NetworkEndpoints): Record<string, string> {
    return { [STORAGE_KEYS.selectedNetwork]: JSON.stringify(network) };
}

describe("isTexasHodlNode", () => {
    it("recognises the Texas Hodl preset and no other preset", () => {
        expect(isTexasHodlNode(texas)).toBe(true);
        expect(texas.rest).toBe(`https://${TEXAS_HODL_NODE_HOST}`);
        for (const preset of NETWORK_PRESETS) {
            if (preset.name === "Texas Hodl") continue;
            expect(isTexasHodlNode(preset)).toBe(false);
        }
    });

    it("recognises the node by host even when the saved name differs", () => {
        expect(isTexasHodlNode({ ...dev, rest: `https://${TEXAS_HODL_NODE_HOST}` })).toBe(true);
        expect(isTexasHodlNode({ ...dev, ws: `wss://${TEXAS_HODL_NODE_HOST}/ws` })).toBe(true);
    });

    it("does not treat a lookalike host or a dev node as the Texas Hodl node", () => {
        expect(
            isTexasHodlNode({
                ...texas,
                name: "Dev",
                rest: `https://${TEXAS_HODL_NODE_HOST}.evil.example`,
                rpc: "http://localhost:26657",
                grpc: "",
                ws: "ws://localhost:8585/ws"
            })
        ).toBe(false);
        expect(isTexasHodlNode(localhost)).toBe(false);
        expect(isTexasHodlNode(dev)).toBe(false);
        expect(isTexasHodlNode(block52)).toBe(false);
    });
});

describe("resolveInitialNetwork", () => {
    it("defaults a device with nothing saved to Block52 and records that the migration has run", () => {
        const storage = memoryStorage();

        const resolved = resolveInitialNetwork(storage, block52, block52);

        expect(resolved).toBe(block52);
        expect(resolved.ws).toBe("wss://node1.block52.xyz/ws");
        expect(resolved.rest).toBe("https://node1.block52.xyz");
        expect(resolved.rpc).toBe("https://node1.block52.xyz/rpc/");
        expect(storage.snapshot()[STORAGE_KEYS.selectedNetworkMigratedToBlock52]).toBe(SELECTED_NETWORK_MIGRATION_VALUE);
        expect(storage.snapshot()[STORAGE_KEYS.selectedNetwork]).toBeUndefined();
    });

    it("switches a saved Texas Hodl node to Block52 once and rewrites the saved choice", () => {
        const storage = memoryStorage(saved(texas));

        const resolved = resolveInitialNetwork(storage, block52, block52);

        expect(resolved).toBe(block52);
        const persisted = JSON.parse(storage.snapshot()[STORAGE_KEYS.selectedNetwork]) as NetworkEndpoints;
        expect(persisted).toEqual(block52);
        expect(storage.snapshot()[STORAGE_KEYS.selectedNetworkMigratedToBlock52]).toBe(SELECTED_NETWORK_MIGRATION_VALUE);
    });

    it("keeps a Texas Hodl choice made after the migration flag is set", () => {
        const storage = memoryStorage({
            ...saved(texas),
            [STORAGE_KEYS.selectedNetworkMigratedToBlock52]: SELECTED_NETWORK_MIGRATION_VALUE
        });

        const resolved = resolveInitialNetwork(storage, block52, block52);

        expect(resolved.name).toBe("Texas Hodl");
        expect(resolved.ws).toBe("wss://node.texashodl.net/ws");
        expect(JSON.parse(storage.snapshot()[STORAGE_KEYS.selectedNetwork]).name).toBe("Texas Hodl");
    });

    it("leaves a saved localhost node and a saved dev node alone, and still records the flag", () => {
        const localStorageStub = memoryStorage(saved(localhost));
        expect(resolveInitialNetwork(localStorageStub, block52, block52).name).toBe("Localhost");
        expect(JSON.parse(localStorageStub.snapshot()[STORAGE_KEYS.selectedNetwork]).ws).toBe("ws://localhost:8585/ws");
        expect(localStorageStub.snapshot()[STORAGE_KEYS.selectedNetworkMigratedToBlock52]).toBe(SELECTED_NETWORK_MIGRATION_VALUE);

        const devStorage = memoryStorage(saved(dev));
        expect(resolveInitialNetwork(devStorage, block52, block52)).toEqual(dev);
        expect(devStorage.snapshot()[STORAGE_KEYS.selectedNetworkMigratedToBlock52]).toBe(SELECTED_NETWORK_MIGRATION_VALUE);
    });

    it("leaves an already-selected Block52 node in place", () => {
        const storage = memoryStorage(saved(block52));

        expect(resolveInitialNetwork(storage, block52, block52)).toEqual(block52);
        expect(JSON.parse(storage.snapshot()[STORAGE_KEYS.selectedNetwork]).name).toBe("Block52");
    });

    it("migrates a saved network that points at the Texas Hodl host under another name", () => {
        const renamed = { ...dev, name: "My Node", rest: `https://${TEXAS_HODL_NODE_HOST}` };
        const storage = memoryStorage(saved(renamed));

        expect(resolveInitialNetwork(storage, block52, block52).name).toBe("Block52");
        expect(JSON.parse(storage.snapshot()[STORAGE_KEYS.selectedNetwork]).rest).toBe("https://node1.block52.xyz");
    });

    it("falls back to the default when the saved choice is corrupt or missing its websocket", () => {
        const corrupt = memoryStorage({ [STORAGE_KEYS.selectedNetwork]: "not-valid-json{{{" });
        expect(resolveInitialNetwork(corrupt, block52, block52)).toBe(block52);
        expect(corrupt.snapshot()[STORAGE_KEYS.selectedNetworkMigratedToBlock52]).toBe(SELECTED_NETWORK_MIGRATION_VALUE);

        const oldFormat = memoryStorage({
            [STORAGE_KEYS.selectedNetwork]: JSON.stringify({ name: "OldNetwork", rpc: "http://old", rest: "http://old", grpc: "http://old" })
        });
        expect(resolveInitialNetwork(oldFormat, block52, block52)).toBe(block52);
    });

    it("uses the env-selected default for a new visitor, and still migrates a saved Texas Hodl node to Block52", () => {
        const fresh = memoryStorage();
        expect(resolveInitialNetwork(fresh, localhost, block52).name).toBe("Localhost");

        const savedTexas = memoryStorage(saved(texas));
        expect(resolveInitialNetwork(savedTexas, localhost, block52)).toBe(block52);
    });

    it("does not mark the migration done when the rewritten choice cannot be stored", () => {
        const storage: NetworkPreferenceStorage = {
            getItem: key => (key === STORAGE_KEYS.selectedNetwork ? JSON.stringify(texas) : null),
            setItem: () => {
                throw new Error("storage blocked");
            }
        };

        expect(resolveInitialNetwork(storage, block52, block52)).toBe(block52);
        expect(storage.getItem(STORAGE_KEYS.selectedNetworkMigratedToBlock52)).toBeNull();
    });

    it("is idempotent: a second resolution after migrating keeps Block52", () => {
        const storage = memoryStorage(saved(texas));

        expect(resolveInitialNetwork(storage, block52, block52).name).toBe("Block52");
        expect(resolveInitialNetwork(storage, block52, block52).name).toBe("Block52");
        expect(JSON.parse(storage.snapshot()[STORAGE_KEYS.selectedNetwork]).name).toBe("Block52");
    });
});
