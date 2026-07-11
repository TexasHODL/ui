import { test as base, expect } from "@playwright/test";

/**
 * Deterministic test wallet (BIP39 test vector). Its b52 address was derived via
 * the SDK's getAddressFromMnemonic — signing works from the mnemonic alone, no
 * funds or on-chain account required (the stub grants balance separately).
 */
export const TEST_MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank yellow";
export const TEST_ADDRESS = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";

/** The cash table the stub seeds (packages/pvm-stub/src/holdem.ts CASH_GAME_ID). */
export const CASH_GAME_ID =
  "0x00000000000000000000000000000000000000000000000000000000cafe0001";

/** Must match NETWORK_PRESETS[4] "Stub" in src/context/NetworkContext.tsx. */
const STUB_NETWORK = {
  name: "Stub",
  rpc: "http://localhost:8546",
  rest: "http://localhost:8546",
  grpc: "http://localhost:8546",
  ws: "ws://localhost:8546/ws",
};

// localStorage keys the UI reads (src/utils/cosmos/storage.ts + constants/storageKeys.ts).
const KEY_MNEMONIC = "user_cosmos_mnemonic";
const KEY_ADDRESS = "user_cosmos_address";
const KEY_NETWORK = "selectedNetwork";

/**
 * Extends Playwright's `test` so every test starts with a funded, network-selected
 * wallet — seeded into localStorage via addInitScript BEFORE any app script runs,
 * so the UI boots straight past onboarding and the network dropdown onto the Stub.
 */
export const test = base.extend<{ seededPage: void }>({
  seededPage: [
    async ({ page }, use) => {
      // Reset the stub's in-memory game state so each test starts from a fresh,
      // empty table (the stub is a single shared process across the run).
      await fetch("http://localhost:8546/__control/reset", { method: "POST" }).catch(() => {});
      await page.addInitScript(
        ([mnemonic, address, network, kM, kA, kN]) => {
          localStorage.setItem(kM, mnemonic);
          localStorage.setItem(kA, address);
          localStorage.setItem(kN, network);
        },
        [
          TEST_MNEMONIC,
          TEST_ADDRESS,
          JSON.stringify(STUB_NETWORK),
          KEY_MNEMONIC,
          KEY_ADDRESS,
          KEY_NETWORK,
        ] as const
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
