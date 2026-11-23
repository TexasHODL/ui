import { render, screen } from "@testing-library/react";
import GenesisState from "./GenesisState";

type MockApi = {
    getAccounts: jest.Mock;
    getValidators: jest.Mock;
    getBalanceByAddress: jest.Mock;
};

const mockBlock52Api: MockApi = {
    getAccounts: jest.fn(),
    getValidators: jest.fn(),
    getBalanceByAddress: jest.fn()
};
const mockTexasHodlApi: MockApi = {
    getAccounts: jest.fn(),
    getValidators: jest.fn(),
    getBalanceByAddress: jest.fn()
};

let mockNetwork = { name: "Block52", rest: "https://node1.block52.xyz" };

jest.mock("../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../components/common/PageHeading", () => ({
    PageHeading: ({ title }: { title: string }) => <h1>{title}</h1>
}));
jest.mock("../hooks/wallet/useCosmosWallet", () => ({
    __esModule: true,
    default: () => ({ address: null })
}));
jest.mock("../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: mockNetwork })
}));
jest.mock("../context/CosmosApiContext", () => ({
    useCosmosApi: (baseUrl?: string) => ((baseUrl ?? mockNetwork.rest).includes("texashodl") ? mockTexasHodlApi : mockBlock52Api)
}));
jest.mock("@cosmjs/proto-signing", () => ({
    DirectSecp256k1HdWallet: {
        fromMnemonic: async () => ({ getAccounts: async () => [{ address: "b52derived" }] })
    }
}));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../utils/clipboard", () => ({ copyToClipboard: jest.fn() }));

function stubApi(api: MockApi, address: string) {
    api.getAccounts.mockResolvedValue({ accounts: [{ address, account_number: "0", sequence: "0" }] });
    api.getValidators.mockResolvedValue({ validators: [] });
    api.getBalanceByAddress.mockResolvedValue({ balances: [{ denom: "usdc", amount: "1000000" }] });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockNetwork = { name: "Block52", rest: "https://node1.block52.xyz" };
    stubApi(mockBlock52Api, "b52block52account");
    stubApi(mockTexasHodlApi, "b52texashodlaccount");
});

it("refetches genesis accounts when the selected network changes", async () => {
    const { rerender } = render(<GenesisState />);
    expect(await screen.findByText("b52block52account")).toBeInTheDocument();
    expect(mockBlock52Api.getAccounts).toHaveBeenCalledTimes(1);
    expect(mockTexasHodlApi.getAccounts).not.toHaveBeenCalled();

    mockNetwork = { name: "Texas Hodl", rest: "https://node.texashodl.net" };
    rerender(<GenesisState />);
    expect(await screen.findByText("b52texashodlaccount")).toBeInTheDocument();
    expect(screen.queryByText("b52block52account")).not.toBeInTheDocument();
    expect(mockTexasHodlApi.getAccounts).toHaveBeenCalledTimes(1);
    expect(mockBlock52Api.getAccounts).toHaveBeenCalledTimes(1);
});
