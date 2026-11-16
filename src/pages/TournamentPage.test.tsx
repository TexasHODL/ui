import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { copyToClipboard } from "../utils/clipboard";
import { displayTableName } from "../utils/generatedTableName";
import { tournamentShareUrl } from "../utils/tableUrl";
import TournamentPage from "./TournamentPage";
import type { TournamentStateDTO } from "../types/tournament";
import type { TournamentInfo } from "../hooks/tournament/useTournament";

jest.mock("../utils/clipboard", () => ({ copyToClipboard: jest.fn() }));
jest.mock("../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../context/profile/ProfileAvatarContext", () => ({
    useProfileAvatar: () => ({ getAvatarForAddress: () => null })
}));

const ID = "0x2d5b0fc4d40f7fc9c60965f9292d0d96d8c8353e2cbd02c6700fb08a124aa444";
const NAME = displayTableName(undefined, ID);
const VIEWER = "poker1viewer";

let mockViewer: string | undefined = VIEWER;
let mockTournamentInfo: TournamentInfo;
let mockBusy = false;
let mockActionError: string | null = null;
const mockRegister = jest.fn().mockResolvedValue(true);
const mockUnregister = jest.fn().mockResolvedValue(true);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();
const mockRefreshBalance = jest.fn().mockResolvedValue(undefined);
let mockWallet = {
    address: VIEWER as string | null,
    balance: [{ denom: "usdc", amount: "1000000" }],
    isLoading: false,
    error: null as string | null,
    refreshBalance: mockRefreshBalance
};

jest.mock("../utils/cosmosAccountUtils", () => ({
    getCosmosAddressSync: () => mockViewer
}));

jest.mock("../hooks/tournament/useTournament", () => ({
    useTournament: () => mockTournamentInfo
}));

jest.mock("../hooks/tournament/useTournamentActions", () => ({
    useTournamentActions: () => ({
        busy: mockBusy,
        error: mockActionError,
        clearError: mockClearError,
        register: mockRegister,
        unregister: mockUnregister,
        create: jest.fn()
    })
}));

jest.mock("../hooks/wallet/useCosmosWallet", () => ({
    useCosmosWallet: () => mockWallet
}));

const registeringTournament = (over: Partial<TournamentStateDTO> = {}, optionOver: Partial<TournamentStateDTO["options"]> = {}): TournamentStateDTO => ({
    tournamentId: ID,
    status: "registering",
    options: {
        buyIn: "10000",
        protocolFeeBps: 1000,
        startingStack: "1500",
        seatsPerTable: 9,
        minEntrants: 2,
        maxEntrants: 27,
        startTime: Date.now() + 3_600_000,
        blindStructure: { preset: "turbo" },
        actionTimeoutSeconds: 30,
        ...optionOver
    },
    entrants: [],
    tables: [],
    level: 0,
    prizePool: "0",
    payouts: [],
    results: [],
    seq: 0,
    ...over
});

const info = (over: Partial<TournamentInfo> = {}, tournament: TournamentStateDTO | undefined = registeringTournament()): TournamentInfo => ({
    tournament,
    isLoading: false,
    error: null,
    playersRemaining: undefined,
    myTable: undefined,
    level: tournament?.level,
    refresh: mockRefresh,
    ...over
});

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={[`/tournament/${ID}`]}>
            <Routes>
                <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
                <Route path="/tournament/:tournamentId/table/:n" element={<div data-testid="seated-table">At the table</div>} />
                <Route path="/wallet" element={<div data-testid="wallet-page">Wallet</div>} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    jest.clearAllMocks();
    mockViewer = VIEWER;
    mockBusy = false;
    mockActionError = null;
    mockWallet = {
        address: VIEWER,
        balance: [{ denom: "usdc", amount: "1000000" }],
        isLoading: false,
        error: null,
        refreshBalance: mockRefreshBalance
    };
    mockRegister.mockResolvedValue(true);
    mockUnregister.mockResolvedValue(true);
    mockTournamentInfo = info();
});

test("a registering tournament is the landing page: generated name, fees, balance, share, and Register & pay calls the chain", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(NAME);
    expect(screen.queryByText(/Tournament 0x/)).not.toBeInTheDocument();
    expect(screen.getByText("Multi-table tournament")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-buyin")).toHaveTextContent("$0.01");
    expect(screen.getByTestId("tournament-page-runners")).toHaveTextContent("0 / 27");
    expect(screen.getByTestId("tournament-start-countdown")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-prizepool")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-protocol-fee")).toHaveTextContent("$0.001");
    expect(screen.getByTestId("tournament-page-escrow")).toHaveTextContent("$0.009");
    expect(screen.getByTestId("tournament-page-balance")).toHaveTextContent("$1.00");
    const balanceAmount = screen.getByTestId("tournament-page-balance-amount");
    expect(balanceAmount).toHaveAttribute("data-balance-tone", "enough");
    expect(balanceAmount).toHaveClass("tournament-balance-enough");
    const actions = screen.getByTestId("tournament-registration-actions");
    expect(actions).toHaveClass("justify-end");
    expect(actions).toContainElement(screen.getByTestId("tournament-register"));
    expect(screen.getByTestId("tournament-page-stack")).toHaveTextContent("1,500 chips");
    expect(screen.getByTestId("tournament-escrow-statement")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Share ${NAME}` }));
    expect(copyToClipboard).toHaveBeenCalledWith(tournamentShareUrl(window.location.origin, ID), "Tournament link copied");

    fireEvent.click(screen.getByTestId("tournament-register"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(ID));
    expect(await screen.findByTestId("tournament-register-success")).toHaveTextContent("You're registered");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveAttribute("data-balance-tone", "enough");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveClass("tournament-balance-enough");
    expect(mockRefreshBalance).toHaveBeenCalled();
});

test("a stored name wins over the generated fallback", () => {
    mockTournamentInfo = info({}, registeringTournament({ name: "Sunday Major" }));
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sunday Major");
    expect(screen.getByRole("button", { name: "Share Sunday Major" })).toBeInTheDocument();
});

test("while the transaction is pending, Register & pay waits on the chain", () => {
    mockBusy = true;
    renderPage();
    const button = screen.getByTestId("tournament-register");
    expect(button).toHaveTextContent("Waiting for the chain…");
    expect(button).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a registered player can unregister on the page, without a modal", async () => {
    mockTournamentInfo = info(
        {},
        registeringTournament({
            entrants: [{ address: VIEWER, status: "registered", stack: "1500" }]
        })
    );
    renderPage();
    expect(screen.getByTestId("tournament-you-are-in")).toHaveTextContent("You're registered");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveAttribute("data-balance-tone", "enough");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveClass("tournament-balance-enough");
    expect(screen.queryByTestId("tournament-register")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-registration-actions")).toHaveClass("justify-end");
    expect(screen.getByTestId("tournament-registration-actions")).toContainElement(screen.getByTestId("tournament-unregister"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tournament-unregister"));
    await waitFor(() => expect(mockUnregister).toHaveBeenCalledWith(ID));
    expect(await screen.findByTestId("tournament-unregister-success")).toBeInTheDocument();
    expect(mockRefreshBalance).toHaveBeenCalled();
});

test("without a wallet, Register & pay is disabled and the usual sign-in reason is shown", () => {
    mockViewer = undefined;
    mockWallet = { ...mockWallet, address: null, balance: [] };
    renderPage();
    expect(screen.getByTestId("tournament-register")).toBeDisabled();
    expect(screen.getByTestId("tournament-register-blocked")).toHaveTextContent("Connect a wallet to register");
});

test("not enough funds disables Register & pay and shows the needed amount against the balance", () => {
    mockWallet = { ...mockWallet, balance: [{ denom: "usdc", amount: "1000" }] };
    renderPage();
    expect(screen.getByTestId("tournament-page-balance")).toHaveTextContent("$0.001");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveAttribute("data-balance-tone", "short");
    expect(screen.getByTestId("tournament-page-balance-amount")).toHaveClass("tournament-balance-short");
    expect(screen.getByTestId("tournament-registration-actions")).toHaveClass("justify-end");
    expect(screen.getByTestId("tournament-insufficient-funds")).toHaveTextContent("You need $0.01");
    expect(screen.getByTestId("tournament-insufficient-funds")).toHaveTextContent("your balance is $0.001");
    expect(screen.getByRole("link", { name: "Add funds" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByTestId("tournament-register")).toBeDisabled();
    fireEvent.click(screen.getByTestId("tournament-register"));
    expect(mockRegister).not.toHaveBeenCalled();
});

test("a chain rejection is shown with a short message and the raw detail", () => {
    mockActionError = "insufficient funds: 1000usdc is less than 10000usdc";
    renderPage();
    expect(screen.getByTestId("tournament-action-error")).toHaveTextContent("Not enough funds in your wallet to pay the buy-in.");
    expect(screen.getByTestId("tournament-action-error-detail")).toHaveTextContent("insufficient funds: 1000usdc is less than 10000usdc");
});

test("a seated player is sent to their table, with Take my seat as a fallback", () => {
    const tableGameId = `${ID}-t2`;
    mockTournamentInfo = info(
        { myTable: { gameId: tableGameId, tableId: `${ID}/t2`, seat: 1, tableNumber: 2, tableCount: 3 }, playersRemaining: 12, level: 0 },
        registeringTournament({
            status: "running",
            entrants: [{ address: VIEWER, status: "playing", tableId: `${ID}/t2`, stack: "1500" }],
            prizePool: "18000"
        })
    );
    renderPage();
    expect(screen.getByTestId("seated-table")).toHaveTextContent("At the table");
    expect(screen.queryByTestId("tournament-register")).not.toBeInTheDocument();
});

test("a finished tournament has no Register button", () => {
    mockTournamentInfo = info(
        { playersRemaining: 0, level: 4 },
        registeringTournament({ status: "finished", prizePool: "18000", results: [{ place: 1, playerId: "poker1winner", payout: "18000" }] })
    );
    renderPage();
    expect(screen.queryByTestId("tournament-register")).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-standings")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-status")).toHaveTextContent("Finished");
    expect(screen.getByTestId("tournament-page-runners")).toHaveTextContent("entrant");
    expect(screen.getByTestId("tournament-page-winner")).toHaveTextContent("poker1wi...nner");
});

test("the balance amount is green when it covers the buy-in, and Register & pay is on the right under it", () => {
    renderPage();
    const amount = screen.getByTestId("tournament-page-balance-amount");
    expect(amount).toHaveTextContent("$1.00");
    expect(amount).toHaveAttribute("data-balance-tone", "enough");
    expect(amount).toHaveClass("tournament-balance-enough");
    expect(amount).not.toHaveClass("tournament-balance-short");
    const actions = screen.getByTestId("tournament-registration-actions");
    expect(actions).toHaveClass("justify-end");
    expect(actions).toContainElement(screen.getByTestId("tournament-register"));
    expect(screen.getByTestId("tournament-register")).not.toBeDisabled();
});

test("the balance amount is red when it does not cover the buy-in", () => {
    mockWallet = { ...mockWallet, balance: [{ denom: "usdc", amount: "1000" }] };
    renderPage();
    const amount = screen.getByTestId("tournament-page-balance-amount");
    expect(amount).toHaveTextContent("$0.001");
    expect(amount).toHaveAttribute("data-balance-tone", "short");
    expect(amount).toHaveClass("tournament-balance-short");
    expect(amount).not.toHaveClass("tournament-balance-enough");
    expect(screen.getByTestId("tournament-register")).toBeDisabled();
});

test("the balance amount stays green when the player is registered, even if the remaining wallet would not cover another buy-in", () => {
    mockWallet = { ...mockWallet, balance: [{ denom: "usdc", amount: "1000" }] };
    mockTournamentInfo = info(
        {},
        registeringTournament({
            entrants: [{ address: VIEWER, status: "registered", stack: "1500" }]
        })
    );
    renderPage();
    const amount = screen.getByTestId("tournament-page-balance-amount");
    expect(amount).toHaveAttribute("data-balance-tone", "enough");
    expect(amount).toHaveClass("tournament-balance-enough");
    expect(amount).not.toHaveClass("tournament-balance-short");
});

test("a finished tournament shows a podium, Place/Player/Prize headers, and prizes in green", () => {
    mockTournamentInfo = info(
        { playersRemaining: 0, level: 7 },
        registeringTournament({
            status: "finished",
            prizePool: "16000000",
            results: [
                { place: 1, playerId: "poker1winnerxxxxxx", payout: "8000000" },
                { place: 2, playerId: "poker1runnerupxxxx", payout: "4800000" },
                { place: 3, playerId: "poker1thirdxxxxxxxx", payout: "3200000" },
                { place: 4, playerId: "poker1bubblexxxxxxx", payout: "0" }
            ]
        })
    );
    renderPage();
    expect(screen.getByTestId("tournament-podium")).toBeInTheDocument();
    const places = screen.getAllByTestId(/tournament-podium-place-/);
    expect(places.map(el => el.getAttribute("data-place"))).toEqual(["2", "1", "3"]);
    expect(screen.getByTestId("tournament-standings-header")).toHaveTextContent("Place");
    expect(screen.getByTestId("tournament-standings-header")).toHaveTextContent("Player");
    expect(screen.getByTestId("tournament-standings-header")).toHaveTextContent("Prize");
    const firstPrize = screen.getByTestId("tournament-standing-prize-1");
    expect(firstPrize).toHaveTextContent("$8.00");
    expect(firstPrize).toHaveClass("tournament-balance-enough");
    expect(screen.getByTestId("tournament-standing-prize-2")).toHaveTextContent("$4.80");
    expect(screen.getByTestId("tournament-standing-prize-2")).toHaveClass("tournament-balance-enough");
    expect(screen.getByTestId("tournament-standing-prize-3")).toHaveTextContent("$3.20");
    expect(screen.getByTestId("tournament-standing-prize-4")).toHaveTextContent("");
    expect(screen.getByTestId("tournament-standings")).toHaveTextContent("1st");
    expect(screen.getByTestId("tournament-standings")).toHaveTextContent("4th");
});

