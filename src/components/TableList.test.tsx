
import { readFileSync } from "fs";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import { displayTableName } from "../utils/generatedTableName";
import TableList from "./TableList";
import { copyToClipboard } from "../utils/clipboard";
jest.mock("../utils/clipboard", () => ({ copyToClipboard: jest.fn() }));
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn();
const mockForceClose = jest.fn();
let mockAddress = "owner";
let mockSeats: Record<string, number> = {};
jest.mock("../hooks/game/useLobbySeats", () => ({ useLobbySeats: () => mockSeats }));
let mockStarted: Record<string, "started" | "finished"> = {};
jest.mock("../hooks/game/useLobbyTournamentStarted", () => ({ useLobbyTournamentStarted: () => mockStarted }));
const base = { minBuyIn: "200000", maxBuyIn: "1000000", minPlayers: 2, maxPlayers: 6, smallBlind: "10000", bigBlind: "20000", gameVariant: GameVariant.TEXAS_HOLDEM, status: "waiting", scheduledStartTime: undefined as number | undefined };
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

beforeEach(() => { jest.clearAllMocks(); mockAddress = "owner"; mockSeats = {}; mockStarted = {}; });

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

test("Create table uses the primary orange-to-pink gradient", () => {
    const onCreateTable = jest.fn();
    render(<TableList onCreateTable={onCreateTable} />);
    const button = screen.getByRole("button", { name: "Create table" });
    expect(button.className).toContain("createButton");
    const css = readFileSync("src/components/TableList.module.css", "utf8");
    const rule = css.slice(css.indexOf(".createButton {"), css.indexOf(".createButton:hover"));
    expect(rule).toContain("linear-gradient(105deg, #ff9717, #ff4a83 52%, #f02bc6)");
    expect(rule).toContain("color: #200c1c");
    fireEvent.click(button);
    expect(onCreateTable).toHaveBeenCalledTimes(1);
});

test("a scheduled tournament says Started only after the hand has begun", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 60_000;
    game.currentPlayers = 5;
    game.minPlayers = 2;
    try {
        const { unmount } = render(<TableList />);
        const waiting = within(screen.getByText("My tournament").closest("tr")!);
        expect(waiting.getByTestId("scheduled-start-label")).toHaveTextContent("Starting");
        expect(waiting.getByRole("link", { name: "Open My tournament" })).toHaveAttribute("href", "/table/tournament");
        unmount();
        mockStarted = { tournament: "started" };
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.getByTestId("scheduled-start-label")).toHaveTextContent("Started");
        expect(row.queryByText("Starting")).not.toBeInTheDocument();
        expect(row.getByRole("link", { name: "Watch My tournament" })).toHaveAttribute("href", "/table/tournament?watch=1");
    } finally {
        Object.assign(game, previous);
    }
});

test("a tournament that never started keeps Cancelled, including the open button", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 20 * 60 * 1000;
    game.currentPlayers = 1;
    game.minPlayers = 4;
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.getByTestId("scheduled-start-label")).toHaveTextContent("Cancelled: not enough players");
        expect(row.getByRole("link", { name: "Cancelled My tournament" })).toBeInTheDocument();
        expect(row.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("a started tournament that still has empty seats uses Watch, not Open table", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 20 * 60 * 1000;
    game.currentPlayers = 5;
    game.minPlayers = 4;
    mockStarted = { tournament: "started" };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        const link = row.getByRole("link", { name: "Watch My tournament" });
        expect(row.getByTestId("scheduled-start-label")).toHaveTextContent("Started");
        expect(row.queryByText("Cancelled: not enough players")).not.toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/table/tournament?watch=1");
        expect(link.className).toContain("watchButton");
        expect(link).toHaveTextContent("Watch");
        expect(row.queryByText("Open table")).not.toBeInTheDocument();
        expect(row.queryByText("Spectate")).not.toBeInTheDocument();
        expect(row.getByRole("button", { name: "Share My tournament" })).toBeInTheDocument();
        expect(row.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("a seated player at a started tournament still returns to the table", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 60_000;
    game.currentPlayers = 5;
    game.minPlayers = 4;
    mockStarted = { tournament: "started" };
    mockSeats = { tournament: 2 };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.getByRole("link", { name: "Return to My tournament" })).toHaveAttribute("href", "/table/tournament");
        expect(row.queryByRole("link", { name: "Watch My tournament" })).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("a cash game stays Open table even if a started mark is present", () => {
    mockStarted = { occupied: "started" };
    render(<TableList />);
    const row = within(screen.getByText("My occupied table").closest("tr")!);
    expect(row.getByRole("link", { name: "Open My occupied table" })).toHaveAttribute("href", "/table/occupied");
    expect(row.queryByRole("link", { name: "Watch My occupied table" })).not.toBeInTheDocument();
});

test("a finished tournament uses Watch for a non-seated owner", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 20 * 60 * 1000;
    game.currentPlayers = 5;
    game.minPlayers = 4;
    mockStarted = { tournament: "finished" };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        const link = row.getByRole("link", { name: "Watch My tournament" });
        expect(row.getByTestId("scheduled-start-label")).toHaveTextContent("Finished");
        expect(row.getByText("Your table")).toBeInTheDocument();
        expect(row.queryByText(/You’re seated/)).not.toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/table/tournament?watch=1");
        expect(link.className).toContain("watchButton");
        expect(row.queryByText("Open table")).not.toBeInTheDocument();
        expect(row.queryByRole("link", { name: "Cancelled My tournament" })).not.toBeInTheDocument();
        expect(row.queryByRole("button", { name: "Close & refund" })).not.toBeInTheDocument();
        expect(row.queryByRole("button", { name: "Delete table" })).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("a finished tournament uses Watch for a non-seated visitor", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 20 * 60 * 1000;
    game.currentPlayers = 5;
    game.minPlayers = 4;
    mockAddress = "visitor";
    mockStarted = { tournament: "finished" };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.queryByText("Your table")).not.toBeInTheDocument();
        expect(row.getByRole("link", { name: "Watch My tournament" })).toHaveAttribute("href", "/table/tournament?watch=1");
        expect(row.queryByText("Open table")).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("a seated player at a finished tournament still returns to the table", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers, minPlayers: game.minPlayers };
    game.scheduledStartTime = Date.now() - 20 * 60 * 1000;
    game.currentPlayers = 1;
    game.minPlayers = 4;
    mockStarted = { tournament: "finished" };
    mockSeats = { tournament: 3 };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.getByTestId("scheduled-start-label")).toHaveTextContent("Finished");
        expect(row.getByRole("link", { name: "Return to My tournament" })).toHaveAttribute("href", "/table/tournament");
        expect(row.queryByRole("link", { name: "Watch My tournament" })).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("an unscheduled sit-and-go that has finished with empty seats uses Watch", () => {
    const game = mockGames.find(item => item.gameId === "tournament")!;
    const previous = { scheduledStartTime: game.scheduledStartTime, currentPlayers: game.currentPlayers };
    game.scheduledStartTime = undefined;
    game.currentPlayers = 1;
    mockStarted = { tournament: "finished" };
    try {
        render(<TableList />);
        const row = within(screen.getByText("My tournament").closest("tr")!);
        expect(row.queryByTestId("scheduled-start-label")).not.toBeInTheDocument();
        expect(row.getByRole("link", { name: "Watch My tournament" })).toHaveAttribute("href", "/table/tournament?watch=1");
        expect(row.queryByText("Open table")).not.toBeInTheDocument();
        expect(row.queryByText("Cancelled")).not.toBeInTheDocument();
    } finally {
        Object.assign(game, previous);
    }
});

test("share buttons copy a direct table link without an options menu", () => {
    const { container } = render(<TableList />);
    fireEvent.click(screen.getByRole("button", { name: "Share My empty table" }));
    expect(copyToClipboard).toHaveBeenCalledWith(`${window.location.origin}/table/mine`, "Table link copied");
    expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByText("Copy table ID")).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockForceClose).not.toHaveBeenCalled();
});
