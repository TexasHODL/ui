import { render, screen } from "@testing-library/react";
import { GameFormat } from "@block52/poker-vm-sdk";
import { TableModals, type TableModalsProps } from "./TableModals";

jest.mock("../../../modals", () => ({
    SitAndGoAutoJoinModal: () => <div role="dialog">Buy in</div>,
    SitAndGoResultModal: () => <div data-testid="result-handler" />,
    LeaveTableModal: () => <div data-testid="leave-handler" />
}));
jest.mock("../../SitAndGoWaitingModal", () => ({ __esModule: true, default: () => <div role="dialog">Waiting for players</div> }));
jest.mock("../../common/GameStartCountdown", () => ({ __esModule: true, default: () => <div role="dialog">Countdown</div> }));
jest.mock("../../common/TransactionPopup", () => ({ __esModule: true, default: () => null }));

const props = (): TableModalsProps => ({
    isWatchMode: false, hasOpenSeats: true,
    showCountdown: false, gameStartTime: null, handleCountdownComplete: jest.fn(), handleSkipCountdown: jest.fn(),
    gameState: {}, gameFormat: GameFormat.SIT_AND_GO, isUserAlreadyPlaying: false, tableId: "fixture",
    onAutoJoinSuccess: jest.fn(), isSitAndGoWaitingForPlayers: false, handleLeaveTableClick: jest.fn(),
    recentTxHash: null, handleCloseTransactionPopup: jest.fn(), isLeaveModalOpen: false,
    handleLeaveModalClose: jest.fn(), handleLeaveTableConfirm: jest.fn(), handleClaimWinnings: jest.fn(),
    currentPlayerStack: "0", isInActiveHand: false
});

it("keeps entry available when opening an unfilled Sit & Go normally", () => {
    render(<TableModals {...props()} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Buy in");
});

it("never prompts a Watch visitor when seats or game snapshots change", () => {
    const defaults = props();
    const { rerender } = render(<TableModals {...defaults} isWatchMode hasOpenSeats={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<TableModals {...defaults} isWatchMode hasOpenSeats gameState={{ handNumber: 25 }} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(defaults.onAutoJoinSuccess).not.toHaveBeenCalled();
});

it("does not obstruct a Watch visitor with a scheduled-game countdown", () => {
    render(<TableModals {...props()} isWatchMode showCountdown gameStartTime="2026-10-12T20:00:00Z" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("does not show a buy-in on a full table opened through an older direct link", () => {
    render(<TableModals {...props()} hasOpenSeats={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("hides the buy-in on a Watch link even when a started tournament still has empty seats", () => {
    render(<TableModals {...props()} isWatchMode hasOpenSeats gameState={{ handNumber: 8, previousActions: [] }} />);
    expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
});

it("hides the buy-in once a sit-and-go has started, even without a Watch link", () => {
    render(<TableModals {...props()} gameState={{ handNumber: 8, previousActions: [] }} />);
    expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
});

it("closes the buy-in when the tournament starts while the page is open", () => {
    const defaults = props();
    const { rerender } = render(<TableModals {...defaults} gameState={{ handNumber: 1, round: "ante", previousActions: [] }} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Buy in");
    rerender(<TableModals {...defaults} gameState={{ handNumber: 8, previousActions: [] }} />);
    expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
});

it("hides the buy-in once the tournament has a winner", () => {
    render(<TableModals {...props()} gameState={{ handNumber: 8, previousActions: [], results: [{ place: 1, playerId: "winner", payout: "100" }] }} />);
    expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
});

it.each([{ gameFormat: GameFormat.CASH }, { isUserAlreadyPlaying: true }, { gameState: null }, { tableId: undefined }])(
    "does not show SNG entry when ineligible: %j", overrides => {
        render(<TableModals {...props()} {...overrides} />);
        expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
    }
);

it("preserves seated players' waiting, countdown and result flows on a Watch link", () => {
    render(<TableModals {...props()} isWatchMode isUserAlreadyPlaying isSitAndGoWaitingForPlayers showCountdown gameStartTime="2026-10-12T20:00:00Z" />);
    expect(screen.queryByText("Buy in")).not.toBeInTheDocument();
    expect(screen.getByText("Waiting for players")).toBeInTheDocument();
    expect(screen.getByText("Countdown")).toBeInTheDocument();
    expect(screen.getByTestId("result-handler")).toBeInTheDocument();
});
