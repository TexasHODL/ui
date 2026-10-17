
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import { displayTableName } from "../utils/generatedTableName";
import TableList from "./TableList";
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn();
const mockForceClose = jest.fn();
let mockAddress = "owner";
let mockSeats: Record<string, number> = {};
jest.mock("../hooks/game/useLobbySeats", () => ({ useLobbySeats: () => mockSeats }));
const base = { minBuyIn: "200000", maxBuyIn: "1000000", minPlayers: 2, maxPlayers: 6, smallBlind: "10000", bigBlind: "20000", gameVariant: GameVariant.TEXAS_HOLDEM, status: "waiting" };
const UNNAMED_ID = "0x031d57314cc4ba07a0ae7edaa0c8c9ff3507dc81b8af99ac8cfe5ba9f5f9aea9";
const mockGames = [
    { ...base, gameId: "mine", name: "My empty table", creator: "OWNER", gameFormat: GameFormat.CASH, currentPlayers: 0 },
    { ...base, gameId: "occupied", name: "My occupied table", creator: "owner", gameFormat: GameFormat.CASH, currentPlayers: 2 },
    { ...base, gameId: "tournament", name: "My tournament", creator: "owner", gameFormat: GameFormat.SIT_AND_GO, currentPlayers: 2 },
    { ...base, gameId: "other", name: "Another table", creator: "someone-else", gameFormat: GameFormat.CASH, currentPlayers: 0 },
    { ...base, gameId: UNNAMED_ID, creator: "someone-else", gameFormat: GameFormat.CASH, currentPlayers: 1 }
];
jest.mock("../hooks/game/useFindGames", () => ({ useFindGames: () => ({ games: mockGames, isLoading: false, error: null, refetch: mockRefresh }), treasuryAddress: "" }));
jest.mock("../hooks/wallet/useCosmosWallet", () => ({ __esModule: true, default: () => ({ address: mockAddress }) }));
jest.mock("../hooks/game/useDeleteGame", () => ({ useDeleteGame: () => ({ deleteGame: mockDelete, isDeleting: false }) }));
jest.mock("../hooks/game/useForceCloseGame", () => ({ useForceCloseGame: () => ({ forceCloseGame: mockForceClose, isClosing: false }) }));
jest.mock("./common", () => ({ Pagination: () => null }));
jest.mock("./modals/DeleteTableModal", () => ({ __esModule: true, default: ({ isOpen, gameId }: { isOpen: boolean; gameId: string }) => isOpen ? <div role="dialog">Delete confirmation: {gameId}</div> : null }));
jest.mock("./modals/ForceCloseTableModal", () => ({ __esModule: true, default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog">Refund confirmation</div> : null }));

beforeEach(() => { jest.clearAllMocks(); mockAddress = "owner"; mockSeats = {}; });

test("seated players get their seat badge and return link, distinct from ownership", () => {
    mockAddress = "player-not-owner";
    mockSeats = { occupied: 4 };
    render(<TableList />);
    expect(screen.getByText("You’re seated · Seat 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to My occupied table" })).toHaveAttribute("href", "/table/occupied");
    expect(screen.getByText("Return to table")).toBeInTheDocument();
    expect(screen.queryByText("Your table")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Return to My empty table" })).toBeNull();
});

test("a seated player returns to a full tournament instead of Watch", () => {
    const game = mockGames.find(game => game.gameId === "tournament")!;
    const previousCount = game.currentPlayers;
    game.currentPlayers = game.maxPlayers;
    mockSeats = { tournament: 2 };
    try {
        render(<TableList />);
        expect(screen.getByRole("link", { name: "Return to My tournament" })).toHaveAttribute("href", "/table/tournament");
        expect(screen.queryByRole("link", { name: "Watch My tournament" })).toBeNull();
    } finally { game.currentPlayers = previousCount; }
});
test("owner controls are visible and open confirmation without sending a transaction", () => {
    render(<TableList />);
    expect(screen.getAllByRole("button", { name: "Delete table" })).toHaveLength(1);
    const closeButtons = screen.getAllByRole("button", { name: "Close & refund" });
    expect(closeButtons).toHaveLength(1);
    expect(closeButtons[0]).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete table" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("mine");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockForceClose).not.toHaveBeenCalled();
});
test.each([2, 6])("occupied Sit & Go with %i players hides unavailable owner actions", playerCount => {
    const game = mockGames.find(game => game.gameId === "tournament")!;
    const previousCount = game.currentPlayers;
    game.currentPlayers = playerCount;
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
        expect(row.queryByRole("button", { name: "Delete table" })).not.toBeInTheDocument();
    } finally { game.currentPlayers = previousCount; }
});
test("empty Sit & Go keeps its delete action", () => {
    const game = mockGames.find(game => game.gameId === "tournament")!;
    const previousCount = game.currentPlayers;
    game.currentPlayers = 0;
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
        fireEvent.click(row.getByRole("button", { name: "Delete table" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("tournament");
        expect(mockDelete).not.toHaveBeenCalled();
    } finally { game.currentPlayers = previousCount; }
});
test("My tables filters by the connected creator and non-owners cannot delete", () => {
    const { unmount } = render(<TableList />);
    fireEvent.click(screen.getByRole("checkbox", { name: "My tables" }));
    expect(screen.queryByText("Another table")).not.toBeInTheDocument();
    expect(screen.getByText("My empty table")).toBeInTheDocument();
    unmount();
    mockAddress = "unknown";
    render(<TableList />);
    expect(screen.queryByRole("button", { name: "Delete table" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
});
test("a creation receipt revision refreshes the displayed list", async () => {
    const { rerender } = render(<TableList refreshKey={0} />);
    expect(mockRefresh).not.toHaveBeenCalled();
    rerender(<TableList refreshKey={1} />);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
});

test("unnamed tables show a generated name", () => {
    render(<TableList />);
    const generated = displayTableName(undefined, UNNAMED_ID);
    expect(screen.getByText(generated)).toBeInTheDocument();
    expect(screen.queryByText("Table " + UNNAMED_ID.slice(-6))).not.toBeInTheDocument();
    expect(screen.getByText("My empty table")).toBeInTheDocument();
});

test("Watch links carry viewing intent while open tables keep the normal join route", () => {
    const game = mockGames.find(game => game.gameId === "tournament")!;
    const previousCount = game.currentPlayers;
    game.currentPlayers = game.maxPlayers;
    try {
        render(<TableList />);
        expect(screen.getByRole("link", { name: "Watch My tournament" })).toHaveAttribute("href", "/table/tournament?watch=1");
        expect(screen.getByRole("link", { name: "Open My empty table" })).toHaveAttribute("href", "/table/mine");
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockForceClose).not.toHaveBeenCalled();
    } finally {
        game.currentPlayers = previousCount;
    }
});
