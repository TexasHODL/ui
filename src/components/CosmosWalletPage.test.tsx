import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CosmosWalletPage from "./CosmosWalletPage";

const mockConnect = jest.fn();
const mockClear = jest.fn();
const mockGenerate = jest.fn();
let mockAddress: string | null = "b521-test-wallet";
// Test-only text; never reads a real browser wallet.
const mockSeed = Array(24).fill("testword").join(" ");
jest.mock("../utils/cosmos", () => ({
    getCosmosMnemonic: () => (mockAddress ? mockSeed : null),
    getCosmosAddress: () => mockAddress,
    setCosmosMnemonic: jest.fn(),
    setCosmosAddress: jest.fn(),
    clearCosmosData: () => mockClear(),
    isValidSeedPhrase: jest.fn()
}));
jest.mock("../utils/cosmos/client", () => ({ clearCosmosClient: jest.fn() }));
jest.mock("@block52/poker-vm-sdk", () => ({
    generateWallet: (...args: unknown[]) => mockGenerate(...args),
    createWalletFromMnemonic: jest.fn(),
    getAddressFromMnemonic: jest.fn()
}));
jest.mock("../hooks/wallet/useUserWalletConnect", () => ({
    __esModule: true,
    default: () => ({ open: mockConnect, disconnect: jest.fn(), isConnected: false, address: null })
}));

describe("Wallet page presentation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAddress = "b521-test-wallet";
    });
    it("separates game and funding wallets and leaves recovery/removal collapsed", async () => {
        render(
            <MemoryRouter>
                <CosmosWalletPage />
            </MemoryRouter>
        );
        await screen.findByRole("heading", { name: "Game wallet" });
        expect(screen.getByRole("heading", { name: "Funding wallet" })).toBeInTheDocument();
        expect(screen.queryByText("testword")).not.toBeInTheDocument();
        expect(screen.getByText("Recovery & backup").closest("details")).not.toHaveAttribute("open");
        expect(screen.getByText("Remove from this device").closest("details")).not.toHaveAttribute("open");
        expect(mockClear).not.toHaveBeenCalled();
        expect(mockGenerate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: /Connect Web3 wallet/ }));
        expect(mockConnect).toHaveBeenCalledTimes(1);
    });
    it("offers create/import when there is no saved game wallet", async () => {
        mockAddress = null;
        render(
            <MemoryRouter>
                <CosmosWalletPage />
            </MemoryRouter>
        );
        expect(await screen.findByRole("button", { name: "Create game wallet" })).toBeEnabled();
        fireEvent.click(screen.getByText("Import an existing wallet"));
        expect(screen.getByRole("button", { name: "Import wallet" })).toBeDisabled();
        expect(screen.getByLabelText("Recovery seed phrase")).toBeInTheDocument();
        expect(mockGenerate).not.toHaveBeenCalled();
    });
});
