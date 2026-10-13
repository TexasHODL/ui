import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameFormat } from "@block52/poker-vm-sdk";
import { TableHeader, TableHeaderProps } from "./TableHeader";

jest.mock("../../../common/Modal", () => ({ Modal: () => null }));
jest.mock("../../../NetworkSelector", () => ({ NetworkSelector: () => <span>Test network</span> }));
jest.mock("../../../profile", () => ({ ProfileAvatarButton: () => <button>Avatar</button> }));
jest.mock("../../../../hooks/game/useBlindLevel", () => ({ useBlindLevel: () => ({ isActive: false }) }));

const makeProps = (): TableHeaderProps => ({
    tableId: "0x123456789abcdef",
    tableName: "Friday game",
    isMobileLandscape: false,
    gameFormat: GameFormat.CASH,
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
    handleShareHand: jest.fn(),
    onToggleFocus: jest.fn()
});

describe("Focused table header", () => {
    it("offers light and dark themes directly on the table", () => {
        render(<TableHeader {...makeProps()} />);
        expect(screen.getByRole("button", { name: "Light theme" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
    });
    it("uses the table-only view handler without requiring browser fullscreen support", () => {
        const props = makeProps();
        render(<TableHeader {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
        expect(props.onToggleFocus).toHaveBeenCalledTimes(1);
    });
    it("keeps lobby, invite, history and settings connected to existing handlers", () => {
        const props = makeProps();
        render(<TableHeader {...props} />);
        expect(screen.getByText("Friday game")).toBeInTheDocument();
        expect(screen.getByText("$0.01 / $0.02")).toBeInTheDocument();
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
});
