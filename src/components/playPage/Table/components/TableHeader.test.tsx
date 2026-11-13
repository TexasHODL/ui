import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GameFormat, GameVariant } from "@block52/poker-vm-sdk";
import { displayTableName } from "../../../../utils/generatedTableName";
import { TableHeader, TableHeaderProps } from "./TableHeader";
import { ProvablyFairFrame } from "../../ProvablyFair/ProvablyFairPanel";

jest.mock("../../../common/Modal", () => ({ Modal: () => null }));
jest.mock("../../../NetworkSelector", () => ({ NetworkSelector: () => <span>Test network</span> }));
jest.mock("../../../profile", () => ({ ProfileAvatarButton: () => <button>Avatar</button> }));
jest.mock("../../../../hooks/game/useBlindLevel", () => ({ useBlindLevel: () => ({ isActive: false }) }));
jest.mock("../../../../context/GameStateContext", () => ({
    useGameStateContext: () => ({ gameState: { handNumber: 12, round: "flop" }, gameVariant: undefined, gameName: "Friday game" })
}));

const makeProps = (): TableHeaderProps => ({
    tableId: "0x123456789abcdef",
    tableName: "Friday game",
    isMobileLandscape: false,
    gameFormat: GameFormat.CASH,
    gameVariant: GameVariant.TEXAS_HOLDEM,
    gameOptions: null,
    tableActivePlayers: [],
    publicKey: "test-address",
    formattedAddress: "test-address",
    isBalanceLoading: false,
    balanceFormatted: "20.00",
    formattedValues: { smallBlindFormatted: "0.01", bigBlindFormatted: "0.02", isTournamentStyle: false },
    handNumber: 12,
    actionCount: 3,
    nextToAct: 2,
    currentPlayerData: null,
    openSidebar: false,
    openSettings: false,
    handleLobbyClick: jest.fn(),
    handleCopyTableLink: jest.fn(),
    handleDepositClick: jest.fn(),
    fetchAccountBalance: jest.fn(),
    copyToClipboard: jest.fn(),
    onCloseSideBar: jest.fn(),
    onToggleSettings: jest.fn(),
    handleLeaveTableClick: jest.fn(),
    handleShareHand: jest.fn()
});

describe("Focused table header", () => {
    it("keeps the color theme out of the table header", () => {
        render(<TableHeader {...makeProps()} />);
        expect(screen.queryByRole("group", { name: "Color theme" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Light theme" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Dark theme" })).not.toBeInTheDocument();
    });
    it("no longer offers Full screen in the PC table options menu (it lives in Settings)", () => {
        render(<TableHeader {...makeProps()} />);
        expect(screen.queryByRole("button", { name: /full screen/i })).not.toBeInTheDocument();
    });
    it("shows a generated name when the table has no custom name", () => {
        const props = makeProps();
        props.tableName = undefined;
        render(<TableHeader {...props} />);
        const generated = displayTableName(undefined, props.tableId);
        expect(screen.getByText(generated)).toBeInTheDocument();
        expect(screen.queryByText("Table " + props.tableId.slice(-6))).not.toBeInTheDocument();
    });
    it("keeps lobby, invite, history and settings connected to existing handlers", () => {
        const props = makeProps();
        render(<TableHeader {...props} />);
        expect(screen.getByText("Friday game")).toBeInTheDocument();
        expect(screen.getByText("$0.01 / $0.02")).toBeInTheDocument();
        const hand = screen.getByText("Hand #12");
        const next = screen.getByText("Next: Seat 2");
        expect(hand.parentElement).toBe(next.parentElement);
        expect(hand.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        const panels = screen.getByRole("group", { name: "Table panels" });
        expect(screen.getByRole("banner")).toContainElement(panels);
        expect(panels).toContainElement(screen.getByRole("button", { name: "History" }));
        expect(panels).toContainElement(screen.getByRole("button", { name: "Settings" }));
        expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-controls", "table-history-panel");
        expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-controls", "table-settings-panel");
        fireEvent.click(screen.getByRole("button", { name: "Lobby" }));
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));
        fireEvent.click(screen.getByRole("button", { name: "History" }));
        fireEvent.click(screen.getByRole("button", { name: "Settings" }));
        expect(props.handleLobbyClick).toHaveBeenCalledTimes(1);
        expect(props.handleCopyTableLink).toHaveBeenCalledTimes(1);
        expect(props.onCloseSideBar).toHaveBeenCalledTimes(1);
        expect(props.onToggleSettings).toHaveBeenCalledTimes(1);
        expect(props.handleLeaveTableClick).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: "Provably fair" })).not.toBeInTheDocument();
    });

    it("puts the provably fair shield with the header icon buttons", () => {
        render(
            <MemoryRouter>
                <ProvablyFairFrame enabled>
                    <TableHeader {...makeProps()} handleOpenReplay={jest.fn()} replayHand={4} />
                </ProvablyFairFrame>
            </MemoryRouter>
        );
        const shield = screen.getByRole("button", { name: "Provably fair" });
        expect(shield.closest("[class*='roomTools']")).toBe(screen.getByRole("button", { name: "Invite" }).parentElement);
        expect(shield.compareDocumentPosition(screen.getByRole("button", { name: "Replay" })) & Node.DOCUMENT_POSITION_PRECEDING).not.toBe(0);
        expect(shield.compareDocumentPosition(screen.getByLabelText("Table options")) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        fireEvent.click(shield);
        expect(screen.getByRole("dialog", { name: "Provably fair deal" })).toBeInTheDocument();
    });

    it("does not label tournament chip blinds as dollars", () => {
        const props = makeProps();
        props.formattedValues = { smallBlindFormatted: "25", bigBlindFormatted: "50", isTournamentStyle: true };
        render(<TableHeader {...props} />);
        expect(screen.getByText("25 / 50")).toBeInTheDocument();
        expect(screen.queryByText("$25 / $50")).not.toBeInTheDocument();
    });

    it("keeps table and wallet extras collapsed by default", () => {
        render(<TableHeader {...makeProps()} />);
        expect(screen.getByLabelText("Table options").closest("details")).not.toHaveAttribute("open");
        expect(screen.getByLabelText("Wallet options").closest("details")).not.toHaveAttribute("open");
        expect(screen.queryByRole("button", { name: "Leave table" })).not.toBeInTheDocument();
    });
    it("shows the rake rate and cap next to blinds / hand / next", () => {
        const props = makeProps();
        props.gameOptions = { rake: { rakeFreeThreshold: "0", rakePercentage: 5, rakeCap: "100000", owner: "b521owner" } } as never;
        render(<TableHeader {...props} />);
        const rake = screen.getByTestId("header-rake");
        expect(rake).toHaveTextContent("Rake 5% \u00b7 cap $0.10");
        expect(rake).toHaveAttribute("title", "5% of each pot is taken as rake, capped at $0.10 per hand.");
        expect(rake.parentElement).toHaveTextContent("Hand #12");
    });

    it("hides rake when the table takes none, and on sit-and-go tables", () => {
        const { unmount } = render(<TableHeader {...makeProps()} />);
        expect(screen.queryByTestId("header-rake")).toBeNull();
        unmount();
        const props = makeProps();
        props.gameFormat = GameFormat.SIT_AND_GO;
        props.gameOptions = { rake: { rakeFreeThreshold: "0", rakePercentage: 5, rakeCap: "100000", owner: "x" } } as never;
        render(<TableHeader {...props} />);
        expect(screen.queryByTestId("header-rake")).toBeNull();
    });
});
