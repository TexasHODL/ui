import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { copyToClipboard } from "../utils/clipboard";
import { displayTableName } from "../utils/generatedTableName";
import { tournamentShareUrl } from "../utils/tableUrl";
import TournamentPage from "./TournamentPage";
import type { TournamentStateDTO } from "../types/tournament";
import type { TournamentInfo } from "../hooks/tournament/useTournament";

jest.mock("../utils/clipboard", () => ({ copyToClipboard: jest.fn() }));
jest.mock("../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../components/common", () => ({
    Modal: ({ isOpen, title, children, ariaLabel }: { isOpen: boolean; title?: string; children?: ReactNode; ariaLabel?: string }) =>
        isOpen ? <div role="dialog" aria-label={ariaLabel || title}>{children}</div> : null
}));

const ID = "0x2d5b0fc4d40f7fc9c60965f9292d0d96d8c8353e2cbd02c6700fb08a124aa444";
const NAME = displayTableName(undefined, ID);
const VIEWER = "poker1viewer";

let mockViewer: string | undefined = VIEWER;
let mockTournamentInfo: TournamentInfo;
const mockRegister = jest.fn().mockResolvedValue(true);
const mockUnregister = jest.fn().mockResolvedValue(true);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

jest.mock("../utils/cosmosAccountUtils", () => ({
    getCosmosAddressSync: () => mockViewer
}));

jest.mock("../hooks/tournament/useTournament", () => ({
    useTournament: () => mockTournamentInfo
}));

jest.mock("../hooks/tournament/useTournamentActions", () => ({
    useTournamentActions: () => ({
        busy: false,
        error: null,
        clearError: mockClearError,
        register: mockRegister,
        unregister: mockUnregister,
        create: jest.fn()
    })
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
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    jest.clearAllMocks();
    mockViewer = VIEWER;
    mockTournamentInfo = info();
});

test("a registering tournament is the landing page: generated name, details, share, and Register opens the modal", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(NAME);
    expect(screen.queryByText(/Tournament 0x/)).not.toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-buyin")).toHaveTextContent("$0.01");
    expect(screen.getByTestId("tournament-page-runners")).toHaveTextContent("0 / 27");
    expect(screen.getByTestId("tournament-start-countdown")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-page-prizepool")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Share ${NAME}` }));
    expect(copyToClipboard).toHaveBeenCalledWith(tournamentShareUrl(window.location.origin, ID), "Tournament link copied");

    fireEvent.click(screen.getByTestId("tournament-register"));
    expect(screen.getByRole("dialog", { name: `Register for ${NAME}` })).toBeInTheDocument();
    expect(screen.getByTestId("tournament-modal-name")).toHaveTextContent(NAME);
    expect(mockRegister).not.toHaveBeenCalled();
});

test("a stored name wins over the generated fallback", () => {
    mockTournamentInfo = info({}, registeringTournament({ name: "Sunday Major" }));
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sunday Major");
    expect(screen.getByRole("button", { name: "Share Sunday Major" })).toBeInTheDocument();
});

test("a registered player can unregister, and the modal shows the name", () => {
    mockTournamentInfo = info(
        {},
        registeringTournament({
            entrants: [{ address: VIEWER, status: "registered", stack: "1500" }]
        })
    );
    renderPage();
    expect(screen.getByTestId("tournament-you-are-in")).toHaveTextContent("You are registered");
    expect(screen.queryByTestId("tournament-register")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tournament-unregister"));
    expect(screen.getByRole("dialog", { name: `Unregister from ${NAME}` })).toBeInTheDocument();
    expect(screen.getByTestId("tournament-modal-name")).toHaveTextContent(NAME);
});

test("without a wallet, Register is disabled and the usual sign-in reason is shown", () => {
    mockViewer = undefined;
    renderPage();
    expect(screen.getByTestId("tournament-register")).toBeDisabled();
    expect(screen.getByTestId("tournament-register-blocked")).toHaveTextContent("Connect a wallet to register");
});

test("a seated player stays on the page and gets Take my seat, not an automatic redirect", () => {
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
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(NAME);
    const seat = screen.getByTestId("tournament-take-seat");
    expect(seat).toHaveAttribute("href", `/tournament/${ID}/table/2`);
    expect(screen.getByTestId("tournament-my-table")).toHaveTextContent("table 2");
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
});
