import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SitAndGoAutoJoinModal from "./SitAndGoAutoJoinModal";
import { STORAGE_KEYS } from "../../constants/storageKeys";

const mockJoin = jest.fn();
const mockBalance = jest.fn();
let mockSeats = [0, 1, 2, 3, 4, 5];
let mockPlaying = false;
const mockOptions = { maxBuyIn: "1000000", entryFee: "0", smallBlind: "10", bigBlind: "20", startingStack: "1500", maxPlayers: 6 };
jest.mock("../../hooks/game/useGameOptions", () => ({ useGameOptions: () => ({ gameOptions: mockOptions }) }));
jest.mock("../../hooks/game/useVacantSeatData", () => ({ useVacantSeatData: () => ({ emptySeatIndexes: mockSeats, isUserAlreadyPlaying: mockPlaying }) }));
jest.mock("../../hooks/playerActions/joinTable", () => ({ joinTable: (...args: unknown[]) => mockJoin(...args) }));
jest.mock("../../utils/cosmosAccountUtils", () => ({ getCosmosBalance: (...args: unknown[]) => mockBalance(...args) }));
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => ({ currentNetwork: { name: "fixture" } }) }));
jest.mock("../../context/GameStateContext", () => ({ useGameStateContext: () => ({ subscribeToTable: jest.fn(), gameState: { gameOptions: { protocolFeeBps: 1000 } } }) }));
jest.mock("../../utils/colorConfig", () => ({ colors: { brand: { primary: "#be87e5" } }, getHexagonStroke: () => "#be87e5" }));
jest.mock("../../utils/numberUtils", () => ({
    formatUSDCToSimpleDollars: (s: string) => (Number(s) / 1e6).toFixed(2),
    formatForSitAndGo: (s: string) => Number(s).toLocaleString("en-US")
}));
jest.mock("../../utils/gameFormatUtils", () => ({
    getGameTypeMnemonic: () => "6-Max",
    formatTableGameDisplay: () => "Texas Hold'em"
}));

beforeEach(() => {
    jest.clearAllMocks();
    mockSeats = [0, 1, 2, 3, 4, 5];
    mockPlaying = false;
    mockBalance.mockResolvedValue("0");
    localStorage.setItem(STORAGE_KEYS.cosmosAddress, "fixture-address");
});
afterEach(() => localStorage.clear());

it("uses the shared theme and keeps fees visible even in short landscape", async () => {
    const height = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 390, configurable: true });
    try {
        render(<SitAndGoAutoJoinModal tableId="fixture-table" onJoinSuccess={jest.fn()} />);
        const dialog = screen.getByRole("dialog", { name: "Sit & Go Tournament" });
        expect(dialog).toHaveClass("hodl-modal", "tournament-entry");
        expect(within(dialog).getAllByRole("img", { name: "Texas HODL" })).toHaveLength(1);
        expect(within(dialog).getByRole("heading", { name: "Sit & Go Tournament" })).toHaveClass("hodl-modal-title");
        const fees = within(screen.getByTestId("sng-fee-breakdown"));
        expect(fees.getByText("$0.90")).toBeInTheDocument();
        expect(fees.getByText("$0.10")).toBeInTheDocument();
        expect(fees.getByText("$1.00")).toBeInTheDocument();
        expect(screen.queryByAltText("Block52 Logo")).not.toBeInTheDocument();
        expect(await screen.findByRole("button", { name: "Insufficient Balance" })).toBeDisabled();
        expect(mockJoin).not.toHaveBeenCalled();
    } finally {
        Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
    }
});

it("keeps a full table unavailable even with sufficient funds", async () => {
    mockSeats = [];
    mockBalance.mockResolvedValue("2000000");
    render(<SitAndGoAutoJoinModal tableId="fixture-table" onJoinSuccess={jest.fn()} />);
    expect(await screen.findByRole("button", { name: "Table Full" })).toBeDisabled();
    expect(mockJoin).not.toHaveBeenCalled();
});

it("retains join errors without dismissing the dialog or retrying automatically", async () => {
    mockBalance.mockResolvedValue("2000000");
    mockJoin.mockRejectedValue(new Error("Fixture: join unavailable"));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
        render(<SitAndGoAutoJoinModal tableId="fixture-table" onJoinSuccess={jest.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Take My Seat" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Fixture: join unavailable");
        expect(mockJoin).toHaveBeenCalledTimes(1);
        expect(mockJoin).toHaveBeenCalledWith("fixture-table", { amount: "1", seatNumber: 0 }, { name: "fixture" });
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    } finally { log.mockRestore(); }
});

it("does not show entry again for an already seated player", async () => {
    mockPlaying = true;
    render(<SitAndGoAutoJoinModal tableId="fixture-table" onJoinSuccess={jest.fn()} />);
    await waitFor(() => expect(mockBalance).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockJoin).not.toHaveBeenCalled();
});
